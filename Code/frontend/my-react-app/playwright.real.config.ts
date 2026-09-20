import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5175';

for (const [name, expected] of Object.entries({ E2E_BASE_URL: baseURL, E2E_GRAPHQL_URL: 'http://127.0.0.1:4100/graphql' })) {
  if (process.env[name] && process.env[name] !== expected) throw new Error(`${name} must be ${expected} for the disposable local E2E stack.`);
}

export default defineConfig({
  testDir: './e2e-real',
  globalSetup: './e2e-real/globalSetup.ts',
  globalTeardown: './e2e-real/globalTeardown.ts',
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/real-stack' }]],
  use: {
    baseURL,
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: { command: 'node e2e-real/startVite.mjs', url: baseURL, reuseExistingServer: false },
  timeout: 60_000,
});
