import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests start the real Express API (mock AI provider, synthetic data) and the Angular
 * dev server, then drive a browser through the critical journeys.
 *
 * On networks that cannot download Playwright's browsers, point PLAYWRIGHT_CHROMIUM_PATH at any
 * compatible Chromium binary (see client/README.md).
 */
const customChromium = process.env['PLAYWRIGHT_CHROMIUM_PATH'];

export default defineConfig({
  testDir: './e2e',
  // The API keeps state in memory, so run serially against one fresh server.
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    launchOptions: customChromium
      ? {
          executablePath: customChromium,
          args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
        }
      : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npx tsx src/server.ts',
      cwd: '../server',
      url: 'http://localhost:3000/api/v1/health',
      env: {
        LOG_LEVEL: 'silent',
        AI_PROVIDER: 'mock',
        RATE_LIMIT_ASSISTANT_MAX: '500',
        PORT: '3000',
      },
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
    },
    {
      command: 'npm start',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
    },
  ],
});
