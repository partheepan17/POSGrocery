import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'minimal.spec.ts',
  fullyParallel: true,
  forbidOnly: !!(globalThis as { process?: { env?: { CI?: string } } }).process?.env?.CI,
  retries: (globalThis as { process?: { env?: { CI?: string } } }).process?.env?.CI ? 2 : 0,
  workers: (globalThis as { process?: { env?: { CI?: string } } }).process?.env?.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/minimal-results.json' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    actionTimeout: 30 * 1000,
    navigationTimeout: 30 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
});











