import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, workers: 2,
  use: { baseURL: 'http://127.0.0.1:4195', browserName: 'chromium', headless: true },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: 'npx wrangler dev --local --ip 127.0.0.1 --port 4195 --inspector-port 9295 --log-level error', url: 'http://127.0.0.1:4195/acervo', reuseExistingServer: false, timeout: 30000 },
});
