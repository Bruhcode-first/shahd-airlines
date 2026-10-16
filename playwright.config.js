import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 5173);

const phone = {
  channel: 'chrome',
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  outputDir: process.env.PW_OUT || 'test-results',
  fullyParallel: false,
  workers: 2,
  use: {
    ...phone,
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { ...phone } },
    {
      name: 'phone-large',
      testMatch: /(shell|landing)\.spec\.js/,
      use: { ...phone, viewport: { width: 414, height: 896 } },
    },
    {
      name: 'phone-small',
      testMatch: /(shell|landing)\.spec\.js/,
      use: { ...phone, viewport: { width: 320, height: 568 } },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...(process.env.VITE_CACHE_DIR ? { VITE_CACHE_DIR: process.env.VITE_CACHE_DIR } : {}),
    },
  },
});
