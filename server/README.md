# BenchFlow AI server

Express 5 + TypeScript API (ES modules, strict mode). Serves synthetic data from in-memory
repositories and talks to an AI provider through one interface. See `../docs/` for the API,
architecture, AI provider, and security notes.

## Commands

Run from `server/` (or use the root scripts from the repo root).

| Command                                   | What it does                                                         |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `npm run dev`                             | Start with `tsx watch` on `PORT` (default 3000), reloading on change |
| `npm test`                                | Run the Vitest suite once (`npm run test:watch` to watch)            |
| `npm run typecheck`                       | `tsc --noEmit`                                                       |
| `npm run lint`                            | ESLint (typescript-eslint, flat config)                              |
| `npm run format:check` / `npm run format` | Prettier check / write                                               |
| `npm run build`                           | Compile `src/` to `dist/`                                            |
| `npm start`                               | Run the compiled server (`node dist/server.js`)                      |

Requires Node.js 22.22.3 or newer (see `engines`) and npm 10+.

## Configuration

Copy the template and edit your copy. `server/.env` is git-ignored.

```bash
cp .env.example .env
```

All variables are validated at startup (`src/config/env.ts`). A bad value stops the server and the
message names the variable, never its value.

| Variable                                                    | Default                 | Purpose                                                          |
| ----------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| `NODE_ENV`                                                  | `development`           | `development`, `test`, or `production`                           |
| `PORT`                                                      | `3000`                  | HTTP port                                                        |
| `CORS_ORIGIN`                                               | `http://localhost:4200` | Comma-separated allowed browser origins                          |
| `DATABASE_URL`                                              | none                    | Reserved for the PostgreSQL repositories; unused today           |
| `AI_PROVIDER`                                               | `mock`                  | `mock` or `azure-openai`                                         |
| `AZURE_OPENAI_ENDPOINT`                                     | none                    | `https://` endpoint (required for `azure-openai`)                |
| `AZURE_OPENAI_API_KEY`                                      | none                    | Secret. Backend only (required for `azure-openai`)               |
| `AZURE_OPENAI_DEPLOYMENT`                                   | none                    | Deployment name (required for `azure-openai`)                    |
| `AZURE_OPENAI_API_VERSION`                                  | none                    | API version your resource supports (required for `azure-openai`) |
| `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET` | none                    | Reserved for the future Entra ID integration; unused today       |
| `LOG_LEVEL`                                                 | `info`                  | `fatal` ... `trace`, or `silent`                                 |
| `AUTH_MODE`                                                 | `mock`                  | Only `mock` exists. Refused when `NODE_ENV=production`           |
| `MOCK_DEFAULT_ROLE`                                         | `employee`              | Role used when no `x-mock-role` header is sent                   |
| `RATE_LIMIT_ASSISTANT_MAX`                                  | `20`                    | Assistant requests per user per minute                           |
| `AI_TIMEOUT_MS`                                             | `20000`                 | Provider timeout (1000-120000)                                   |

## Layout

```
src/
  config/        env validation
  data/          repository interfaces, in-memory implementation, synthetic seed
  middleware/    request id, logging, mock auth, rate limit, error handling
  modules/       one folder per feature: *.router.ts, *.service.ts, *.schemas.ts
    profiles/ skills/ courses/ demand/ recommendations/ learning-plans/ assistant/ feedback/
  providers/     AIProvider interface, MockAIProvider, AzureOpenAIProvider, factory
  shared/        errors, logger, validation helper, text utilities, shared types
  app.ts         builds the Express app from injected dependencies
  server.ts      loads config, composes dependencies, listens
tests/           Vitest + supertest (no network, no real AI)
```

## Conventions

- **Routers are thin.** Parse and validate with Zod in the router (`validate(schema, req.body)`),
  call a service, return JSON. Business rules live in services.
- **Throw `AppError`** (`AppError.notFound()`, `.validation(...)`, ...). The error middleware turns
  everything into `{ error: { code, message, requestId } }`. Express 5 forwards rejected promises
  from async handlers automatically.
- **Depend on interfaces.** Services take `Repositories` and `AIProvider`; `createApp(deps)`
  receives them, so tests inject fakes and a different store or provider needs no service change.
- **Reads return copies** so callers cannot mutate stored state by accident.
- **Never log** request bodies, headers, prompts, AI responses, or secrets.
- Use `x-mock-role: admin` to exercise admin routes locally.

## Adding a module

1. Create `modules/<name>/` with `*.schemas.ts` (Zod), `*.service.ts`, `*.router.ts`.
2. Add any storage to the repository interfaces and the in-memory implementation.
3. Mount the router in `app.ts` under `/api/v1`.
4. Add API tests with `makeApp()` from `tests/helpers.ts`, covering success, validation errors,
   authorization, and not-found.

## Tests

`tests/` holds unit tests (scoring, next skill, plan draft, context and prompt builders, output
validator, config, Azure provider with a fake client) and API integration tests (platform
behaviour, every route family, assistant safety and failure handling, log privacy). The seeded
app is created per test, so tests do not share state. Add a regression test with every bug fix.

## Provider development

See `../docs/ai-provider.md`. In short: implement `AIProvider`, throw `AIProviderError` on
failure, return raw text, and let `assistant.service.ts` validate it.
