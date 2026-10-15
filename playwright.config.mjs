import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, workers: process.env.CI ? 1 : 2,
  forbidOnly: !!process.env.CI,
  globalTimeout: process.env.CI ? 15 * 60 * 1000 : undefined,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:4195', browserName: 'chromium', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: 'npx --no-install wrangler dev --local --ip 127.0.0.1 --port 4195 --inspector-port 9295 --log-level error', url: 'http://127.0.0.1:4195/acervo', reuseExistingServer: false, timeout: process.env.CI ? 120000 : 30000 },
});
