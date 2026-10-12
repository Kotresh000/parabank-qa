import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Sequential: scenarios share state (B depends on A's registered user)
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['./reporters/glassmorphism-reporter.ts', { outputFile: 'test-results/report.html' }],
    ['list'],
  ],
  use: {
    baseURL: 'https://parabank.parasoft.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'test-results/artifacts',
});
