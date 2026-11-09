/**
 * PUBLIC, NON-SECRET configuration only. See the warning in environment.ts.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  applicationName: 'BenchFlow AI',
  /** Mock identity is development-only. Replace MockAuthService with Microsoft Entra ID (MSAL). */
  enableMockAuth: false,
  enableAssistant: true,
};
