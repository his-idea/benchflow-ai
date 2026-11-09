# BenchFlow AI client

Angular 22 single-page app: standalone components, signals, RxJS for HTTP, typed reactive forms,
Angular Material with local design tokens. It talks only to the Express API under `/api/v1`.

## Commands

Run from `client/` (or use the root scripts).

| Command                                   | What it does                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm start`                               | `ng serve` on http://localhost:4200 with `/api` proxied to http://localhost:3000           |
| `npm test`                                | Unit and component tests (Vitest runner, jsdom), single run. `npm run test:watch` to watch |
| `npm run typecheck`                       | Type-check the app and the specs                                                           |
| `npm run lint`                            | angular-eslint, including the template accessibility rules                                 |
| `npm run format:check` / `npm run format` | Prettier check / write                                                                     |
| `npm run build`                           | Production build into `dist/client/browser`                                                |
| `npm run e2e:install`                     | Download Playwright's Chromium                                                             |
| `npm run e2e`                             | Playwright end-to-end tests (starts the API and `ng serve` itself)                         |

Requires Node.js 22.22.3 or newer (Angular CLI 22.2.4 requirement) and npm 10+.

## Environment files are public

`src/environments/environment.ts` and `environment.production.ts` are compiled into JavaScript
that every user can read. They hold **only** `apiBaseUrl`, `applicationName`, and feature flags
(`enableMockAuth`, `enableAssistant`). Never add keys, secrets, passwords, or tokens. Secrets
belong in `server/.env`. The production build swaps files through `fileReplacements` in
`angular.json`.

## Structure

```
src/app/
  core/       config token, HTTP (ApiError, interceptors), mock auth + guards, shell layout,
              notification service, skill catalog store
  features/   dashboard, learning, learning-plan, assistant, profile, admin
              (each: pages/, components/, data-access/, *.routes.ts)
  shared/     models (API DTOs), stateless components (icon, relevance meter, skill level,
              state panels, confirm dialog)
src/styles/   _colors _typography _spacing _variables _mixins _material-theme (+ styles.scss)
src/testing/  test-only helpers and fixtures (excluded from the app build)
public/assets logos, icons, illustrations, i18n placeholder
e2e/          Playwright specs
```

## Conventions

- Standalone components with `ChangeDetectionStrategy.OnPush`; no NgModules.
- Local and derived state in signals; stores are root-provided services exposing
  `status` (`idle | loading | success | error`), data, and `error` signals.
- Pages orchestrate; presentational components use `input()` / `output()`.
- Typed reactive forms. Server `details` are shown as messages when a save is rejected.
- Failed requests are normalised once by `errorInterceptor` into `ApiError`; stores keep it in an
  `error` signal for inline display, and mutations show a toast via `NotificationService`.
- `takeUntilDestroyed()` for imperative subscriptions; `switchMap` cancels stale requests.
- Selectors use the `app-` prefix; files are `kebab-case.component.ts`.
- Do not call an AI provider from the client. All AI goes through `/api/v1/assistant/*`.

## Mock identity (development only)

`MockAuthService` keeps a role (`employee` or `admin`) in `localStorage`; `mockRoleInterceptor`
sends it as `x-mock-role`, and the left navigation shows a role switch (hidden on narrow screens).
`adminGuard` redirects employees away from `/admin/*`. The production build sets
`enableMockAuth: false`: no switch, no header, always `employee`. To adopt Microsoft Entra ID,
replace `MockAuthService` with an MSAL-backed service exposing the same `role`, `isAdmin` and
`isAuthenticated` signals (see `../docs/security.md`).

## Design tokens

Colours, type, and spacing live in `src/styles/*.scss` and are exposed to components as CSS
variables (`--color-primary`, `--font-display`, ...). The palette follows the blueprint
(`#5b21b6` primary) with one deliberate change: **muted text is `#526077`**, not `#64748b`,
because the original is borderline against the `#f8fafc` background. Fonts (Bricolage Grotesque
for headings, Public Sans for body) are bundled locally through `@fontsource-variable`, and icons
are inline SVG, so the app makes no third-party requests.

## Accessibility

- Skip link, landmarks (`header`, `nav`, `main`, `footer`), one `h1` per page with ordered headings.
- All controls are keyboard operable with a visible focus ring; icon-only buttons have names.
- Relevance is always shown as text and a labelled `role="meter"`; status never relies on colour.
- Chat uses `role="log"` with polite announcements; loading uses `role="status"`; errors `role="alert"`.
- `prefers-reduced-motion` is respected.
- Automated: axe-core runs in the component tests and, with colour contrast, in the Playwright
  suite on every main page including the admin screens. **No manual screen-reader or
  keyboard-only review has been done yet.**

## Testing

- **Unit/component** (`npm test`): API error mapping, interceptors, guards, all stores (loading,
  success, failure, cancellation, retry), the relevance meter, course card, chat composer, and the
  profile form, each with axe assertions where there is UI. Use `provideTestHttp()` from
  `src/testing/http.ts` so tests run through the real interceptors.
- Component tests that await promise chains should let microtasks drain before asserting
  (see `settle()` in the profile spec), because `whenStable()` does not track plain promises.
- **End-to-end** (`npm run e2e`): discover a course, add it to the plan, ask the assistant for a
  plan, edit and save the draft, admin CRUD, role redirects, 404, phone layout, and axe checks.
  The tests start the API with the mock provider and reuse already-running servers when not in CI.
  The API keeps state in memory, so restart it for a pristine run.

### Playwright on restricted networks

`npm run e2e:install` downloads Chromium from Playwright's CDN. If that host is blocked, point
the tests at any compatible Chromium:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium npm run e2e
```

During development of this repository the browser tests were run this way, with a Chromium 153
build from the `@sparticuz/chromium` npm package (Playwright 1.64 targets Chromium 156). The
default `playwright install` path has not been exercised in this environment.

## Known limitations

- On screens up to 52rem wide the bottom bar shows the five main pages only; admin links and the
  role switch are not shown (admins still get shortcuts on the dashboard).
- The production build cannot reach admin screens until a real identity provider is integrated.
- Plan reordering uses up/down buttons (keyboard friendly) rather than drag and drop.
- English only; `public/assets/i18n/en.json` is a placeholder.
