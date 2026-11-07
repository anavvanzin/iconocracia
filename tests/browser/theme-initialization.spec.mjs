import { test, expect } from '@playwright/test';

const pages = ['/', '/acervo', '/sobre', '/constelacoes', '/404'];
const themeScript = '**/assets/constellation-field.js*';

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
});

async function blockStorage(page, failure) {
  await page.addInitScript(failure => {
    const blocked = () => { throw new DOMException('Storage blocked for regression test', 'SecurityError'); };
    if (failure === 'getter') {
      Object.defineProperty(window, 'localStorage', { configurable: true, get: blocked });
    } else {
      Storage.prototype.getItem = blocked;
      Storage.prototype.setItem = blocked;
    }
    // Observe actual rendered frames, from the first visible body through load.
    window.themeFrames = [];
    function sample() {
      if (document.body && document.body.getBoundingClientRect().height) {
        window.themeFrames.push(document.documentElement.getAttribute('data-theme'));
      }
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }, failure);
}

async function stableFrames(page, expected) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const frames = await page.evaluate(() => window.themeFrames);
  expect(frames.length, 'must sample rendered frames').toBeGreaterThan(0);
  expect([...new Set(frames)], 'no unexpected theme at any sampled frame').toEqual([expected]);
}

for (const failure of ['getItem', 'getter']) {
  for (const colorScheme of ['dark', 'light']) {
    test(`${failure} blocked: ${colorScheme} system theme is stable before and after deferred JS on every page`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.emulateMedia({ colorScheme });
      await blockStorage(page, failure);
      const expected = colorScheme === 'dark' ? 'noite' : null;
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const path of pages) {
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        await page.route(themeScript, async route => { await gate; await route.continue(); });
        try {
          await page.goto(path, { waitUntil: 'commit' });
          await expect(page.locator('main')).toBeVisible();
          // A visible document while the script is held proves this is the head
          // initializer, not a successful correction after DOMContentLoaded.
          await expect.poll(() => page.evaluate(() => performance.getEntriesByName('first-contentful-paint').length)).toBe(1);
          expect(await page.locator('html').getAttribute('data-theme')).toBe(expected);
          await stableFrames(page, expected);
        } finally {
          release();
          await page.unroute(themeScript);
        }
        await page.waitForLoadState('load');
        await expect(page.locator('#night-toggle')).toHaveText(colorScheme === 'dark' ? 'DIA' : 'NOITE');
        await stableFrames(page, expected);
      }
      expect(errors).toEqual([]);
    });
  }

  test(`${failure} blocked: dark theme survives link navigation and reload; toggle still works`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ colorScheme: 'dark' });
    await blockStorage(page, failure);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    for (const label of ['Acervo', 'Pesquisa e método', 'Constelações', 'Início']) {
      await page.locator('.ex-header nav').getByRole('link', { name: label, exact: true }).click();
      await expect(page.locator('#night-toggle')).toHaveAttribute('aria-pressed', 'true');
      await stableFrames(page, 'noite');
    }
    await page.reload();
    await stableFrames(page, 'noite');
    // Without persistence a manual choice lasts for this document only.
    await page.locator('#night-toggle').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'noite');
    await expect(page.locator('#night-toggle')).toHaveText('NOITE');
    await page.reload();
    await expect(page.locator('#night-toggle')).toHaveText('DIA');
    await stableFrames(page, 'noite');
    expect(errors).toEqual([]);
  });
}
