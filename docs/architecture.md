# Architecture

BenchFlow AI is a browser SPA plus a thin backend-for-frontend (BFF). All data and every AI call
go through the BFF so that credentials, prompts, validation, and authorization stay on a server
the application team controls.

```
Browser (Angular SPA)
   |  HTTPS / JSON   (dev: ng serve proxies /api -> http://localhost:3000)
   v
Express API  (server/)                                  /api/v1/*
   |-- request-id, logging, Helmet, CORS, body limit
   |-- mock auth  (req.user = { id, role })             -> replace with Entra ID
   |-- modules: profiles, skills, courses, demand, recommendations,
   |            learning-plans, assistant, feedback
   |-- repositories (interfaces)                        -> in-memory today, PostgreSQL later
   +-- AIProvider (interface)
         |-- MockAIProvider          default, deterministic, no credentials
         +-- AzureOpenAIProvider     wired, used only when AI_PROVIDER=azure-openai
```

## Repository layout

| Path | Purpose |
|---|---|
| `client/` | Angular 22 app. `core/` (config, HTTP, auth, layout), `features/` (one folder per page group), `shared/` (stateless components, models). |
| `server/` | Express + TypeScript API. `modules/` (one folder per feature), `providers/` (AI), `data/` (repositories and synthetic seed), `middleware/`, `config/`, `shared/`. |
| `docs/` | This documentation. |

## Key design decisions

**1. Deterministic scoring, AI explains.** Course relevance is computed by
`server/src/modules/recommendations/scoring.ts` using fixed weights (35 / 25 / 15 / 10 / 10 / 5:
target-role alignment, skill gap, project demand, interests, prerequisites, available time). The
model never sees a chance to invent or change a score. This keeps results testable, cheap, and
explainable. Every recommendation carries a per-factor breakdown and at least one reason.

**2. The assistant only knows what it is handed.** For each request the server assembles a
minimal context (profile skills and goals, top courses with scores, current plan, approved
knowledge snippets, current demand tags) where every item has a `sourceId`. The model's reply must
be JSON that cites only those ids. Anything else is replaced by a controlled fallback.

**3. Plan drafts are deterministic too.** `generate-plan` builds the draft with
`learning-plans/plan-draft.ts` (ranked courses, prerequisites met, fits the weekly hours inside
four weeks). The model only describes the draft; it cannot add or reorder courses.

**4. Repository and provider interfaces.** Services depend on `Repositories` and `AIProvider`,
never on a concrete store or SDK. Tests and the local app use in-memory repositories and the mock
provider; production swaps implementations at one composition point (`server.ts`).

**5. Standard contracts.** Every error is `{ error: { code, message, requestId, details? } }`.
Every response carries `x-request-id`. The Angular client normalises failures in one
interceptor and shows them inline or as toasts.

## Assistant request flow

1. Validate the body with Zod (message 1-1000 chars, strict fields) and sanitise control characters.
2. Authorize via `req.user`; load only that user's profile and plan.
3. Rank courses, pick the next skill, retrieve knowledge snippets by keyword overlap.
4. Build the context and prompt. Trusted instructions go in `system`; context and the user's
   message are fenced as untrusted data in `user`, with delimiter look-alikes stripped.
5. Call the provider with a timeout (`AI_TIMEOUT_MS`) and an abort signal.
6. Parse and validate the output (schema, known course ids, known source ids, every recommended
   course cited). Failure returns a safe fallback with `fallback: true`.
7. Return the answer, allowed suggested actions, and readable grounding references.
8. Log request id, provider, task, outcome, latency, and token counts. Never log message text.

Provider failures and timeouts return `503 ASSISTANT_UNAVAILABLE`; the client keeps the user's
message and offers a retry.

## Frontend structure

- Standalone components, lazy routes, signals for state, RxJS for HTTP composition.
- Feature stores are root-provided services holding `status` / data / `error` signals
  (`LearningStore`, `PlanStore`, `PlanDraftStore`, `AssistantStore`, `ProfileStore`,
  `SkillCatalogStore`).
- Presentational components take inputs and emit outputs; pages orchestrate.
- No NgRx: the cross-feature state is small. Revisit if flows become event-heavy.

## Replacing the mock pieces

See `docs/security.md` for Microsoft Entra ID and the "Replacing the in-memory repositories"
section below.

### Replacing the in-memory repositories with PostgreSQL

Nothing in the repository today talks to a database; `DATABASE_URL` is reserved and unused.

1. Create tables matching the domain model (users/profiles, skills, roles, user_skills, courses,
   course_skills, course_prerequisites, demand_signals, learning_plans, plan_items, feedback,
   conversations, chat_messages, knowledge_snippets) in a migration tool of your choice.
2. Implement each interface in `server/src/data/repositories.ts` (`ProfileRepository`,
   `CourseRepository`, ...) with a driver such as `pg`. Use parameterised queries only.
3. Keep every method's contract: reads return copies, unknown ids return `undefined`, and
   `PlanRepository.getCurrent` returns the newest `active` plan.
4. Write one shared contract test suite and run it against both the in-memory and PostgreSQL
   implementations so behaviour cannot drift.
5. Compose the new implementation in `server.ts` in place of `createInMemoryRepositories()`.
6. Decide retention for conversations and feedback first (see `docs/security.md`); the in-memory
   store keeps at most 50 messages per conversation and loses everything on restart.
7. Seed data stays synthetic. Do not load real employee data until the data-source, privacy,
   and responsible-AI approvals in the blueprint are complete.
