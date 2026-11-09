# Security and privacy notes

This MVP uses **synthetic data only**, an **in-memory** store, and a **mock identity**. The
controls below are implemented. The "before production" list says what is not.

## Implemented controls

| Area | Control |
|---|---|
| Secrets | Real values only in `server/.env` (git-ignored) or a secret store. `client/` environment files are public and hold no secrets. Startup errors name variables, never values. |
| AI calls | Only the Express backend calls an AI provider. The browser never sees keys, prompts, or provider URLs. |
| Config | Validated at startup with Zod; placeholders from `.env.example` are rejected; Azure endpoint must be `https`. |
| Transport headers | Helmet defaults, `x-powered-by` disabled. |
| CORS | Strict allow-list from `CORS_ORIGIN`; other origins get no CORS headers. |
| Input | Zod validation with unknown fields rejected; 16 KB JSON limit; control characters stripped from chat text; message length 1-1000. |
| Authorization | `requireRole('admin')` on write routes for courses and all demand routes. Plans are scoped to the caller; another user's plan or conversation returns `404`. |
| Abuse | Per-user rate limit on assistant routes (`RATE_LIMIT_ASSISTANT_MAX` per minute, `429` with `Retry-After`). Provider timeout (`AI_TIMEOUT_MS`). |
| Prompt injection | Trusted instructions are separate from fenced, untrusted context and user text; delimiter look-alikes are stripped; the model has no tools and cannot perform actions; its output is schema- and grounding-validated before use. |
| No autonomous actions | The assistant can only suggest. Adding to a plan, saving a draft, or any admin change goes through normal authorised API calls initiated by the user. |
| Logging | One structured line per request (request id, method, route, status, latency). No headers, bodies, query strings, prompts, or responses. Credential paths are redacted. AI telemetry records provider, task, outcome, latency, token counts. |
| Errors | Internal failures return a generic message plus request id; details go to logs as error class only. |
| Responsible use | Course relevance is labelled as a recommendation aid everywhere it appears; no employee ranking, employability judgement, or staffing decision exists in the code. |

## Data handling

| Data | Handling today |
|---|---|
| Course metadata, skills, roles | Synthetic, low sensitivity |
| Profile (goals, skill levels) | Synthetic. Minimised in prompts: no display name, no free text |
| Chat messages | Held in memory only, capped at 50 per conversation, lost on restart, never logged |
| Feedback | In memory; comments are not logged |
| Demand signals | Aggregate skill-level only (the admin screen says not to record individuals or named projects) |

## Mock authentication (development only)

`mockAuth` trusts the `x-mock-role` header. That is acceptable only on a developer machine.
`loadConfig` throws if `NODE_ENV=production` with `AUTH_MODE=mock`, and the production Angular
build sets `enableMockAuth: false` so the role switcher and header disappear.

### Replacing it with Microsoft Entra ID (guidance, not implemented)

1. Register an API app and a SPA app in Entra ID. Define app roles `employee` and `admin` on the
   API app and assign them to groups or users.
2. **Server:** add a middleware in place of `mockAuth` that validates the bearer access token
   (signature via the tenant's JWKS, issuer, audience, expiry) with a maintained library such as
   `jose`, then sets `req.user = { id: <oid claim>, displayName, role }` from the `roles` claim.
   Routes only depend on `req.user` and `requireRole`, so nothing else changes. Add `entra` to the
   `AUTH_MODE` enum in `config/env.ts` (today only `mock` exists) and require the
   `ENTRA_TENANT_ID` / `ENTRA_CLIENT_ID` values already present in `.env.example`.
3. Remove `x-mock-role` from the CORS `allowedHeaders` and add `Authorization`.
4. **Client:** use `@azure/msal-angular`; replace `MockAuthService` with an implementation
   exposing the same `role`, `isAdmin`, `isAuthenticated` signals, add the MSAL interceptor in
   place of `mockRoleInterceptor`, and gate routes with MSAL's guard.
5. `ENTRA_CLIENT_SECRET` is only needed for confidential-client flows (for example
   on-behalf-of calls); the SPA must never hold it.
6. Add tests for: expired token, wrong audience, missing role, and role escalation attempts.

## Before connecting any real data or going to production

- [ ] Real authentication and role claims (above); remove mock auth
- [ ] Persistent store with encryption at rest and backups
- [ ] Approved retention for chat messages, feedback, and logs; deletion process
- [ ] Privacy, security, and responsible-AI review; decide exactly what may be sent to the AI service
- [ ] Authoritative sources and owners for skills, courses, demand, and policy content
- [ ] Secret store or managed identity; rotate any key that has ever been committed or pasted
- [ ] Secret scanning in CI; dependency and container vulnerability scans
- [ ] Alerting on repeated auth failures, usage spikes, and provider failures
- [ ] Manual accessibility review with assistive technology (only automated checks exist)
- [ ] A real Azure OpenAI test pass (the provider is unit-tested with a fake client only)
- [ ] A shared or distributed rate limiter if running more than one server instance
      (the current limiter is per process)
- [ ] Review the CSP and other headers for the deployed topology (Helmet defaults are used)

## If a key is exposed

Revoke and rotate it immediately, inspect provider and application logs for misuse, and remove
it from git history. Do not rely on deleting the file alone.
