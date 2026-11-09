# BenchFlow AI

AI-powered bench assistant, upskilling recommender, and learning-plan portal. An Angular 22
front end and an Express + TypeScript back end that runs **entirely on synthetic data with a mock
AI provider**, so it works with no credentials. A real Azure OpenAI provider is wired in behind a
single environment switch.

> **Everything here is synthetic.** No real employee, course, project, or policy data is included,
> and none should be added until the approvals listed in [`docs/security.md`](docs/security.md)
> are complete.

## Contents

1. [Product overview](#1-product-overview)
2. [Architecture](#2-architecture)
3. [Technology stack](#3-technology-stack)
4. [Repository structure](#4-repository-structure)
5. [Prerequisites](#5-prerequisites)
6. [First-time setup](#6-first-time-setup)
7. [Configuration](#7-configuration)
8. [Warning: Angular environment files are public](#8-warning-angular-environment-files-are-public)
9. [Running the app](#9-running-the-app)
10. [Local URLs and the mock identity](#10-local-urls-and-the-mock-identity)
11. [Using the application](#11-using-the-application)
12. [Mock data and the mock AI provider](#12-mock-data-and-the-mock-ai-provider)
13. [Adding Azure OpenAI credentials](#13-adding-azure-openai-credentials)
14. [Switching `AI_PROVIDER`](#14-switching-ai_provider)
15. [Quality checks and tests](#15-quality-checks-and-tests)
16. [API summary](#16-api-summary)
17. [Troubleshooting](#17-troubleshooting)
18. [Security and privacy](#18-security-and-privacy)
19. [Accessibility](#19-accessibility)
20. [Known limitations, roadmap, and production readiness](#20-known-limitations-roadmap-and-production-readiness)
21. [Replacing the mock repository and mock auth](#21-replacing-the-mock-repository-and-mock-auth)
22. [Never commit secrets](#22-never-commit-secrets)

## 1. Product overview

BenchFlow AI is a self-service store for employees who are on bench. It answers three questions:
**What should I learn next? Which courses fit me best? What should I do this week to become more
project-ready?**

Primary use cases:

- See a **dashboard** with a recommended next skill, average skill level, recommended-course
  count, and plan progress.
- Keep an editable **skill profile** (target role, interests, weekly hours, learning style, skills).
- Browse the **Upskilling Store**: search, filter by level, skill, and duration, sort, and see
  *why* each course is relevant.
- Build a **four-week learning plan**: add, remove, reorder, set status and finishing week.
- Ask the **Bench Assistant** questions and have it **draft a plan** you edit before saving.
- **Administrators** manage the course catalog and aggregate demand signals.

Design principles: recommendations always explain themselves; the score is *course relevance*,
**not** a performance rating and never used for staffing decisions; the assistant answers only
from supplied, approved context and says so when it cannot; all AI calls and secrets stay on the
backend.

## 2. Architecture

```
 Browser
   Angular SPA  (client/, http://localhost:4200)
      |
      |  HTTPS / JSON      dev: ng serve proxies /api -> http://localhost:3000
      v
 Express API  (server/, http://localhost:3000/api/v1)
   |  request id, logging, Helmet, CORS, 16 KB body limit
   |  mock auth  (x-mock-role)                    <- replace with Microsoft Entra ID
   |  modules: profiles | skills | courses | demand | recommendations
   |           learning-plans | assistant | feedback
   |
   +-- Repositories (interfaces) --> in-memory + synthetic seed   <- replace with PostgreSQL
   |
   +-- AIProvider (interface)
         +-- MockAIProvider          default, deterministic, no credentials
         +-- AzureOpenAIProvider     only when AI_PROVIDER=azure-openai
```

Deterministic code ranks courses and builds plan drafts; the AI only explains them, and every
reply is validated before a user sees it. Details: [`docs/architecture.md`](docs/architecture.md).

## 3. Technology stack

| Layer | Package | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | 22.23.4 (tested); `>=22.22.3` required | root, server, client `engines` |
| Package manager | npm | 10.9.9 (tested); `>=10` |  |
| Frontend framework | Angular (core, router, forms, common) | 22.2.4 | standalone, signals, zoneless |
| UI components | Angular Material / CDK | 22.2.6 | Material 3 theme |
| Reactive streams | RxJS | 7.8.2 |  |
| Language | TypeScript | 6.0.3 | strict; same version in client and server |
| Fonts | @fontsource-variable/bricolage-grotesque, public-sans | 5.3.0 | bundled locally |
| Backend framework | Express | 5.3.0 | v5 |
| Validation | Zod | 4.6.7 | requests, config, AI output |
| HTTP hardening | Helmet / cors / express-rate-limit | 8.3.0 / 2.8.6 / 8.7.3 |  |
| Logging | pino | 10.4.0 | with credential redaction |
| AI SDK | openai (AzureOpenAI client) | 7.50.0 | used only by the Azure provider |
| Config | dotenv | 18.0.9 |  |
| Dev runner | tsx | 4.23.15 |  |
| Server tests | Vitest + supertest | 5.1.0 + 7.3.1 |  |
| Client tests | Angular unit-test builder (Vitest runner) + jsdom | 5.1.0 + 30.0.0 |  |
| End-to-end | Playwright | 1.64.1 |  |
| Accessibility testing | axe-core | 4.14.0 | component tests and in-browser |
| Lint | ESLint / typescript-eslint / angular-eslint | 10.14.0 / 8.72.1 / 22.6.0 |  |
| Format | Prettier | 3.9.10 |  |
| Dev orchestration | concurrently | 10.0.6 | root `npm run dev` |

Versions are pinned exactly in each `package.json`. Angular 22.2.4 was the `latest` stable
release on the npm registry when this repository was generated.

## 4. Repository structure

```
benchflow-ai/
  client/                 Angular application (see client/README.md)
    src/app/core/         config, HTTP + interceptors, mock auth + guards, shell layout
    src/app/features/     dashboard, learning, learning-plan, assistant, profile, admin
    src/app/shared/       API models, stateless components
    src/environments/     PUBLIC build-time settings only
    src/styles/           design tokens and Material theme
    public/assets/        logos, icons, illustrations, i18n placeholder
    e2e/                  Playwright tests
  server/                 Express TypeScript API (see server/README.md)
    src/config/           environment validation
    src/data/             repository interfaces, in-memory store, synthetic seed
    src/middleware/       request id, logging, auth, rate limit, errors
    src/modules/          one folder per feature
    src/providers/        AIProvider interface, mock and Azure implementations
    tests/                Vitest + supertest
    .env.example          template of backend variables (never real values)
  docs/                   architecture.md, api.md, ai-provider.md, security.md
  package.json            root convenience scripts
  .editorconfig  .gitignore  README.md
```

## 5. Prerequisites

- **Node.js 22.22.3 or newer** (the Angular CLI 22.2.4 requires `^22.22.3`, `^24.15.0`, or
  `>=26`). Developed and tested on **Node 22.23.4**; other versions have not been tried.
- **npm 10 or newer** (tested with 10.9.9).
- Ports **3000** (API) and **4200** (web) free.
- For the browser tests only: a Chromium that Playwright can use (see section 15).

Check with `node -v && npm -v`.

## 6. First-time setup

From a clean clone:

```bash
git clone <your-repo-url> benchflow-ai
cd benchflow-ai
npm run install:all        # installs root, server, and client dependencies
cp server/.env.example server/.env   # optional: the defaults already run in mock mode
npm run dev                # starts the API and the web app together
```

Then open http://localhost:4200. The first Angular build takes around 15 seconds.

`server/.env` is optional for mock mode (every variable has a default). If you create it, it is
git-ignored.

## 7. Configuration

### Server (`server/.env`, validated at startup)

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | `development` / `test` / `production` |
| `PORT` | `3000` | API port |
| `CORS_ORIGIN` | `http://localhost:4200` | Comma-separated allowed browser origins |
| `DATABASE_URL` | none | Reserved for PostgreSQL; unused today |
| `AI_PROVIDER` | `mock` | `mock` or `azure-openai` |
| `AZURE_OPENAI_ENDPOINT` | none | Required for `azure-openai` (`https://`) |
| `AZURE_OPENAI_API_KEY` | none | **Secret.** Required for `azure-openai` |
| `AZURE_OPENAI_DEPLOYMENT` | none | Required for `azure-openai` |
| `AZURE_OPENAI_API_VERSION` | none | Required for `azure-openai` |
| `ENTRA_TENANT_ID` / `ENTRA_CLIENT_ID` / `ENTRA_CLIENT_SECRET` | none | Reserved for Entra ID; unused today |
| `LOG_LEVEL` | `info` | `fatal` to `trace`, or `silent` |
| `AUTH_MODE` | `mock` | Only `mock` exists; refused in production |
| `MOCK_DEFAULT_ROLE` | `employee` | Role when no `x-mock-role` header is sent |
| `RATE_LIMIT_ASSISTANT_MAX` | `20` | Assistant requests per user per minute |
| `AI_TIMEOUT_MS` | `20000` | AI provider timeout |

### Client (`client/src/environments/*.ts`, public)

| Setting | Dev | Production | Purpose |
|---|---|---|---|
| `apiBaseUrl` | `/api/v1` | `/api/v1` | API prefix (proxied in dev; serve behind the same origin or a gateway) |
| `applicationName` | `BenchFlow AI` | `BenchFlow AI` | Display name |
| `enableMockAuth` | `true` | `false` | Mock identity, role switch, `x-mock-role` header |
| `enableAssistant` | `true` | `true` | Feature flag (reserved) |

## 8. Warning: Angular environment files are public

> **Anything in `client/src/environments/` is compiled into JavaScript that every user can read
> in their browser.** Never put API keys, client secrets, passwords, connection strings, or
> tokens there. Secrets belong only in `server/.env` or your deployment's secret store. The
> browser never needs an AI key: it calls your API, and your API calls the AI provider.

## 9. Running the app

| Goal | Command (from the repo root) |
|---|---|
| Both together | `npm run dev` |
| API only (watch mode) | `npm run dev:server` |
| Web only | `npm run dev:client` (needs the API for data) |
| Production build of both | `npm run build` |
| Run the compiled API | `cd server && npm start` |

`npm start` runs with the default development settings and the mock identity. Setting
`NODE_ENV=production` is refused while `AUTH_MODE=mock` is the only mode, by design (section 21).

## 10. Local URLs and the mock identity

| What | URL |
|---|---|
| Web app | http://localhost:4200 |
| API base | http://localhost:3000/api/v1 |
| Health check | http://localhost:3000/api/v1/health |

Everyone is the synthetic employee **Alex Synthetic**. The only variable is the **role**:
`employee` (default) or `admin`. In development, use the **Mock role** switch at the bottom of
the left navigation (desktop widths). For API calls, send `x-mock-role: admin`. Admins see an
"Administration" group in the navigation (Courses, Demand). Employees visiting `/admin/*` are
redirected to the dashboard, and the API returns `403` for admin routes.

## 11. Using the application

- **Dashboard** (`/dashboard`): the large panel shows your recommended next skill, why, and a
  link to its top course. Below are average skill level, recommended courses (relevance of 60% or
  more), plan progress, and a skill snapshot.
- **Skill profile** (`/profile`): edit target role, interests, weekly hours (0-40), learning
  style, and skill levels (0 none to 5 expert). Invalid values show messages and are not saved.
  Saving changes recommendations immediately.
- **Upskilling Store** (`/learning`): search by title, description, provider, or skill; filter by
  level, skill, and duration; sort by relevance, title, or duration. Each card shows course
  relevance as a percentage and bar with the top reason. **Add to plan** / **Remove from plan**
  works from the card or the detail page.
- **Course details** (`/learning/:courseId`): description, skills, prerequisites, the full reason
  list, an expandable "How this is calculated" factor breakdown, an optional link to the course
  page, and a helpful / not helpful rating.
- **My learning plan** (`/plan`): courses grouped by the week you expect to finish them, with
  order numbers. Change status, finishing week, or order (up/down buttons), or remove a course.
  Progress counts milestones in the plan; it is not an assessment of you.
- **Bench Assistant** (`/assistant`): use the suggested questions or type your own (Enter sends,
  Shift+Enter adds a line). Replies show "Based on" references and action buttons. **Create a
  four-week learning plan** produces an editable draft beside the chat: rename it, change weeks,
  reorder, remove courses, then **Save as my plan** (this archives your previous plan) or
  **Discard**. If the assistant is unavailable your message stays and you can **Try again**.
- **Administration** (`/admin/courses`, `/admin/demand`, admin role): create, edit, and delete
  courses (a course in a plan cannot be deleted; set it to *retired*), and manage aggregate
  demand signals with effective dates. Changes affect recommendations immediately.

## 12. Mock data and the mock AI provider

- **Data** is created from `server/src/data/seed.ts`: one synthetic employee, 6 roles, 19 skills,
  16 courses (one draft), 11 demand signals (one expired on purpose), one four-week plan, and six
  approved knowledge snippets. Every course URL is on `example.com`.
- **Storage** is in memory. Restarting the API restores the seed and discards all changes.
- **`MockAIProvider`** is deterministic and builds answers strictly from the context the server
  supplies (same context a real model would get), so behaviour is repeatable and works offline. It
  recognises questions about the next skill, matching courses, plans, and approved policy
  topics; anything else gets an honest "I don't have approved information" answer.
- The mock goes through the **same validation and grounding checks** as a real model.

Try: "What should I learn next?", "Which course best matches my profile?", "How do certification
vouchers work?", "Create a four-week learning plan", and an off-topic question.

## 13. Adding Azure OpenAI credentials

Do this only after the app works in mock mode.

1. `cp server/.env.example server/.env` (skip if it exists). This file is git-ignored.
2. Edit **`server/.env` only**:
   ```
   AI_PROVIDER=azure-openai
   AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
   AZURE_OPENAI_API_KEY=<your key>
   AZURE_OPENAI_DEPLOYMENT=<your deployment name>
   AZURE_OPENAI_API_VERSION=<an API version your resource supports>
   ```
3. Restart the API. A missing or placeholder value stops startup with a message naming the
   variable (never its value).
4. Verify: `curl http://localhost:3000/api/v1/health` should show `"aiProvider":"azure-openai"`;
   then ask the assistant a question and generate a plan.
5. For deployed environments use Azure Key Vault or a managed identity instead of a key file.

> **Honest status:** the Azure provider is covered by unit tests against a fake client but has
> **not been run against a real endpoint**. Test it with your deployment before relying on it.
> See [`docs/ai-provider.md`](docs/ai-provider.md).

## 14. Switching `AI_PROVIDER`

| To use | Set in `server/.env` | Result |
|---|---|---|
| Mock (default) | `AI_PROVIDER=mock` (or unset) | No credentials, deterministic answers |
| Azure OpenAI | `AI_PROVIDER=azure-openai` plus the four `AZURE_OPENAI_*` values | Real model, validated output |

Restart the API after changing it. Switching back to `mock` is always safe and needs no
other change. The Angular app is unaffected.

## 15. Quality checks and tests

Run from the repo root:

| Check | Command |
|---|---|
| Everything (format, lint, types, tests, builds) | `npm run check` |
| Formatting check / fix | `npm run format:check` / `npm run format` |
| Lint | `npm run lint` |
| Type checking | `npm run typecheck` |
| Unit + integration tests (server, then client) | `npm test` |
| Server tests only / client tests only | `npm run test:server` / `npm run test:client` |
| Production builds | `npm run build` |
| End-to-end tests | `npm run e2e:install` once, then `npm run e2e` |

What the suites cover:

- **Server** (Vitest + supertest): scoring edge cases, next skill, plan draft, context and prompt
  builders, output validation and fallback, config validation, Azure provider with a fake client,
  and API integration for every route family including auth, rate limiting, timeouts, and the
  guarantee that chat text is never logged.
- **Client** (Angular unit-test builder, Vitest runner): API error mapping, interceptors, guards,
  every store, and key components with axe accessibility assertions.
- **End to end** (Playwright): discover a course, add it to the plan, ask the assistant for a
  plan, edit and save the draft, admin CRUD, role redirects, 404, phone layout, and axe checks
  (including colour contrast) on all main pages and both admin pages. The runner starts the API
  and the Angular dev server itself.

If Playwright cannot download Chromium (restricted network), use your own build:
`PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium npm run e2e`.

## 16. API summary

Full reference: [`docs/api.md`](docs/api.md). Base URL `http://localhost:3000/api/v1`.

| Method and path | Role |
|---|---|
| `GET /health` | none |
| `GET`, `PATCH /profile/me` | any |
| `GET /skills` | any |
| `GET /courses`, `GET /courses/:id` | any (employees see active courses only) |
| `POST /courses`, `PATCH /courses/:id`, `DELETE /courses/:id` | admin |
| `GET /recommendations/courses`, `GET /recommendations/courses/:courseId` | any |
| `GET /learning-plans/current`, `POST /learning-plans` | any |
| `POST /learning-plans/:id/items`, `PATCH`/`DELETE /learning-plans/:id/items/:itemId` | any |
| `POST /assistant/messages`, `POST /assistant/generate-plan` | any (rate limited) |
| `POST /feedback` | any |
| `GET`, `POST /demand`, `PATCH`/`DELETE /demand/:id` | admin |

```bash
B=http://localhost:3000/api/v1
curl $B/health
curl "$B/recommendations/courses?sort=title&pageSize=3"
curl -X PATCH $B/profile/me -H 'Content-Type: application/json' -d '{"weeklyHours":10}'
curl -X POST $B/assistant/messages -H 'Content-Type: application/json' \
     -d '{"message":"What should I learn next?"}'
curl -X POST $B/assistant/generate-plan -H 'Content-Type: application/json' -d '{}'
# admin-only routes need the mock role header
curl $B/demand -H 'x-mock-role: admin'
```

Errors always look like:
`{ "error": { "code": "FORBIDDEN", "message": "...", "requestId": "..." } }`
(validation errors add a `details` array).

## 17. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Web app loads but every page shows "Can't reach the server" | The API is not running or not on port 3000. Run `npm run dev` (or `npm run dev:server`) and check `/api/v1/health`. If you changed `PORT`, update `client/proxy.conf.json`. |
| Browser console shows a **CORS** error | You are calling the API from an origin not in `CORS_ORIGIN`. Use the Angular dev server (it proxies `/api`, so no CORS is involved), or add your origin to `CORS_ORIGIN` and restart the API. |
| `EADDRINUSE` / "port already in use" | Something else holds 3000 or 4200. Stop it, or set `PORT` (and update `client/proxy.conf.json`), or run `ng serve --port <n>` from `client/` and add that origin to `CORS_ORIGIN`. |
| API exits with "Invalid server configuration" | A `server/.env` value is wrong. The message lists variable names. Fix them, or delete the file to use defaults. |
| "AZURE_OPENAI_... must be set to a real value" | `AI_PROVIDER=azure-openai` but a value is missing or still the `.env.example` placeholder. |
| "AUTH_MODE=mock is not allowed when NODE_ENV=production" | By design. Implement real auth first (section 21) or run with `NODE_ENV=development`. |
| Assistant says it is temporarily unavailable (`503 ASSISTANT_UNAVAILABLE`) | Provider failed or timed out. With Azure: check endpoint, deployment name, API version, and key, and that the key is valid for that resource. Use **Try again**, or raise `AI_TIMEOUT_MS`. The API log line `assistant provider failure` shows the failure kind (`auth`, `timeout`, `rate_limited`, `unavailable`) and HTTP status. |
| Assistant answer is a generic "couldn't produce a reliable answer" (`fallback: true`) | The model's reply was rejected as malformed or ungrounded. Check the deployment supports strict structured output (`response_format: json_schema`). The log shows the rejection reason. |
| `429 RATE_LIMITED` | More than `RATE_LIMIT_ASSISTANT_MAX` assistant calls in a minute. Wait for `Retry-After`, or raise the limit for local work. |
| Data I changed disappeared | The API stores data in memory; a restart (including a `tsx watch` reload on a code change) restores the seed. |
| Admin pages redirect to the dashboard | You are the employee role. Use the Mock role switch (desktop width), or `localStorage.setItem('benchflow.mockRole','admin')` and reload. The production build has no admin access until real auth exists. |
| `npm run e2e` cannot launch a browser | Run `npm run e2e:install`, or set `PLAYWRIGHT_CHROMIUM_PATH`. |
| E2E test fails after earlier runs | The API keeps state in memory. Stop any running dev servers so the runner starts a fresh API. |
| Client tests fail with timing differences | Await promise chains before asserting (see the `settle()` helper in the profile spec). |
| `npm install` engine warnings | Use Node 22.22.3+ (section 5). |

## 18. Security and privacy

- Secrets live only in `server/.env` (git-ignored) or a secret store; the browser never sees an
  AI key, prompt, or provider URL.
- Input is validated with Zod, bodies are limited to 16 KB, CORS is a strict allow-list, Helmet
  headers are on, and assistant calls are rate limited per user.
- The assistant receives minimal context (no name, no free text), treats retrieved text and user
  input as untrusted data, has no tools or actions, and its output is validated for schema and
  grounding.
- Logs record request ids, routes, status, latency, and AI telemetry only: never message text,
  prompts, responses, headers, or secrets.
- Chat messages are held in memory (capped at 50 per conversation) and are lost on restart.

Full controls, data handling table, and the pre-production checklist:
[`docs/security.md`](docs/security.md).

## 19. Accessibility

Skip link and landmarks; ordered headings; labelled form controls with specific error messages;
visible focus on every control; icon-only buttons with accessible names; relevance and status
shown as text, never colour alone; the chat uses a polite live region; loading, error, and empty
states are announced; reduced-motion is respected; the layout works from phone to desktop.
Automated axe-core checks (including colour contrast) pass on all main pages and both admin
pages. **No manual screen-reader or keyboard-only review has been done**; please do one before a
pilot. More in [`client/README.md`](client/README.md).

## 20. Known limitations, roadmap, and production readiness

**Known limitations**

- Synthetic data, in-memory storage, and a mock identity only; nothing persists across restarts.
- The Azure OpenAI provider has not been run against a real endpoint.
- Production builds cannot reach admin screens until a real identity provider is added.
- With the specified scoring weights, an advanced course can rank above beginner courses for
  someone at an intermediate level, because the weights have no course-level-versus-skill-level
  factor. A level-fit factor would need an agreed rebalance.
- The rate limiter and conversation store are per process; running several API instances needs a
  shared store.
- Narrow screens hide admin navigation and the role switch; plan reordering uses buttons, not
  drag and drop; English only.
- Browser tests were run on an npm-packaged Chromium 153 through `PLAYWRIGHT_CHROMIUM_PATH`; the
  default `playwright install` path was not exercised here.

**Roadmap** (from the blueprint, deliberately out of the MVP): explainable opportunity matching,
an internal gig marketplace, a skill-gap analyzer from an approved profile, certification
tracking and study plans, a mock-interview booth, and an onboarding concierge. Viva Learning or
LMS integration, enrolment, and reminders are also future work.

**Production-readiness checklist** (details in [`docs/security.md`](docs/security.md)):
real authentication and roles; persistent encrypted storage; approved retention rules; privacy,
security, and responsible-AI review; authoritative data sources and content owners; secret store
or managed identity; secret and dependency scanning in CI; telemetry and alerting; manual
accessibility review; a real-endpoint AI test pass; a shared rate limiter if scaled out.

## 21. Replacing the mock repository and mock auth

**PostgreSQL.** The data layer is a set of async interfaces in `server/src/data/repositories.ts`.
Implement them with a driver and parameterised queries, run one shared contract test suite against
both the in-memory and PostgreSQL versions, and swap the composition in `server/src/server.ts`.
Settle retention first. Step by step: [`docs/architecture.md`](docs/architecture.md#replacing-the-in-memory-repositories-with-postgresql).

**Microsoft Entra ID.** Routes depend only on `req.user` and `requireRole`, so replace the
`mockAuth` middleware with bearer-token validation (issuer, audience, signature, expiry) that maps
the `roles` claim, add `entra` to `AUTH_MODE`, remove `x-mock-role` from CORS, and swap the
client's `MockAuthService` for an MSAL-backed one with the same signals. Step by step, including
tests to add: [`docs/security.md`](docs/security.md#replacing-it-with-microsoft-entra-id-guidance-not-implemented).
This is guidance only; it is not implemented or tested here.

## 22. Never commit secrets

`.gitignore` ignores `.env` and `.env.*` (but keeps `.env.example`). Keep it that way.

**Never commit or paste into chat, tickets, or Angular files:**

- `AZURE_OPENAI_API_KEY=abc123...` or any API key
- `DATABASE_URL=postgresql://user:realpassword@host/db`
- `ENTRA_CLIENT_SECRET=...`, bearer tokens, or `Authorization` headers
- a `server/.env` file, or a screenshot or log that contains one
- real employee data, resumes, or HR records

Put a placeholder in `.env.example` (for example `replace-locally-only`) and the real value only
in `server/.env` or a secret store. Before committing, run `git status` and `git diff --staged`
and look for `.env` files; consider a secret scanner such as gitleaks in CI.

**If a secret is exposed:** revoke or rotate it immediately, check provider and app logs for
misuse, and remove it from git history; deleting the file in a later commit is not enough.
