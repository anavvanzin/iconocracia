import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('../../site/data/acervo.json', import.meta.url)));
const work = catalog.find(item => item.id === 'BR-005');

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
});

async function setClipboardMode(context, page, mode) {
  if (mode === 'success') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    return;
  }
  await page.addInitScript(mode => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: mode === 'unavailable' ? undefined : {
        writeText: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
      },
    });
  }, mode);
}

for (const locale of [
  { path: '/', archive: '/acervo', heading: 'REGIMES INTERPRETATIVOS (3)', error: 'Falha ao copiar', done: ['Link copiado!', 'ABNT copiada!', 'BibTeX copiado!'] },
  { path: '/en', archive: '/en/acervo', heading: 'INTERPRETIVE REGIMES (3)', error: 'Copy failed', done: ['Link copied!', 'ABNT copied!', 'BibTeX copied!'] },
]) {
  test(`atlas lens uses the native page language at ${locale.path}`, async ({ page }) => {
    await page.goto(locale.path);
    await expect(page.locator('#atlas-lens .atlas-lens-kicker').first()).toHaveText(locale.heading);
  });

  for (const mode of ['success', 'denied', 'unavailable']) {
    test(`record copy controls report ${mode} accurately at ${locale.archive}`, async ({ context, page }) => {
      await setClipboardMode(context, page, mode);
      await page.goto(`${locale.archive}?item=BR-005&visao=palco`);
      await page.locator('#ex-open').click();
      const buttons = [page.locator('.ex-copy-link-btn'), page.locator('.ex-cite-btn').nth(0), page.locator('.ex-cite-btn').nth(1)];
      for (const [index, button] of buttons.entries()) {
        const original = await button.textContent();
        await button.click();
        await expect(button).toHaveText(mode === 'success' ? locale.done[index] : locale.error);
        if (mode === 'success') {
          const copied = await page.evaluate(() => navigator.clipboard.readText());
          if (index === 0) expect(copied).toBe(page.url());
          if (index === 1) expect(copied).toBe(work.citacao);
          if (index === 2) {
            expect(copied).toContain('@misc{BR-005,');
            expect(copied).toContain(`title = {${work.titulo}}`);
          }
        }
        await expect(button).toHaveText(original);
        await expect(button).toBeEnabled();
      }
    });
  }
}

for (const mode of ['success', 'denied', 'unavailable']) {
  test(`English montage share reports ${mode} accurately`, async ({ context, page }) => {
    await setClipboardMode(context, page, mode);
    await page.goto('/en/acervo?comparar=BR-005,BR-003');
    await expect(page.locator('#compare-dialog-title')).toHaveText('Side-by-side comparison');
    const button = page.locator('.ex-compare-copy');
    await expect(button).toHaveText('Copy montage link');
    await button.click();
    await expect(button).toHaveText(mode === 'success' ? 'Link copied!' : 'Copy failed');
    if (mode === 'success') {
      const copied = new URL(await page.evaluate(() => navigator.clipboard.readText()));
      expect(copied.pathname).toBe('/en/acervo');
      expect(copied.searchParams.get('comparar')).toBe('BR-005,BR-003');
    }
    await expect(button).toHaveText('Copy montage link');
    await expect(button).toBeEnabled();
  });
}
