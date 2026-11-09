/**
 * PUBLIC, NON-SECRET configuration only.
 *
 * Everything in this file is compiled into JavaScript that any user can read in their browser.
 * Never put API keys, client secrets, passwords, or tokens here. Secrets live in server/.env.
 */
export const environment = {
  production: false,
  /** The Angular dev server proxies /api to the Express server (see proxy.conf.json). */
  apiBaseUrl: '/api/v1',
  applicationName: 'BenchFlow AI',
  /** Development-only identity: sends x-mock-role and shows the role switcher. */
  enableMockAuth: true,
  enableAssistant: true,
};
