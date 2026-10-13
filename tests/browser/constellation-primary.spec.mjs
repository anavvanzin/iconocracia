import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('../../site/data/acervo.json', import.meta.url)));
const ready = page => expect(page.locator('#result-count')).toContainText(`${catalog.length} de ${catalog.length}`);
test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
});

test('the collection opens as a constellation with all public works and no random highlight', async ({ page }) => {
  await page.goto('/acervo');
  await ready(page);
  await expect(page.locator('#view-constelacao')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.ex-view-toggle button').first()).toHaveAttribute('id', 'view-constelacao');
  await expect(page.locator('#ex-constellation')).toBeVisible();
  await expect(page.locator('.ex-star')).toHaveCount(catalog.length);
  await expect(page.locator('.ex-star-acid')).toHaveCount(0);
  await expect(page.locator('dialog')).not.toBeVisible();
  await expect(page.locator('.ex-stage')).toBeHidden();
  await expect(page.locator('.ex-grid')).toBeHidden();
  expect(new URL(page.url()).searchParams.has('item')).toBe(false);
  await page.reload(); await ready(page);
  await expect(page.locator('dialog')).not.toBeVisible();
  expect(new URL(page.url()).searchParams.has('item')).toBe(false);
});

test('explicit Palco stays in the URL across selection, view changes and reload', async ({ page }) => {
  await page.goto('/acervo?item=BR-009&visao=palco');
  await ready(page);
  await expect(page.locator('.ex-stage')).toBeVisible();
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.locator('.ex-next').click();
  expect(new URL(page.url()).searchParams.get('visao')).toBe('palco');
  const selected = new URL(page.url()).searchParams.get('item');
  await page.reload();
  await ready(page);
  await expect(page.locator('#view-palco')).toHaveAttribute('aria-pressed', 'true');
  expect(new URL(page.url()).searchParams.get('item')).toBe(selected);
  await page.locator('#view-grade').click();
  await page.locator('#view-palco').click();
  expect(new URL(page.url()).searchParams.get('visao')).toBe('palco');
});

test('a direct work link opens its record after loading and returns keyboard focus to its frame', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/data/acervo.json', async route => { await gate; await route.continue(); });
  await page.goto('/acervo?item=US-008', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.exhibition')).toHaveAttribute('aria-busy', 'true');
  const home = page.locator('.ex-header nav a').first();
  await home.focus();
  await expect(home).toBeFocused();
  await expect(page.locator('dialog')).not.toBeVisible();
  release();
  await ready(page);
  await expect(page.locator('.exhibition')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.locator('#dialog-title')).toHaveText(catalog.find(item => item.id === 'US-008').titulo);
  await expect(page.locator('.ex-dialog-close')).toBeFocused();
  await page.keyboard.press('Escape');
  const frame = page.locator('.ex-star[data-id="US-008"]');
  await expect(frame).toBeFocused();
  expect(new URL(page.url()).searchParams.has('item')).toBe(false);
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(frame).toBeFocused();
  await page.reload(); await ready(page);
  await expect(page.locator('dialog')).not.toBeVisible();
});

test('empty filtered constellation gives a visible recovery message', async ({ page }) => {
  await page.goto('/acervo'); await ready(page);
  await page.locator('#q').fill('no-record-match-constellation-test');
  await expect(page.locator('#ex-constellation .ex-empty')).toBeVisible();
  await expect(page.locator('#ex-constellation .ex-empty')).toContainText('Nenhuma obra encontrada');
  await page.locator('#clear-filters').click(); await ready(page);
  await expect(page.locator('.ex-star')).toHaveCount(catalog.length);
});

test('a filter that excludes a linked work cannot turn its fallback into a new direct link', async ({ page }) => {
  await page.goto('/acervo?item=BR-009&q=US-008');
  await expect(page.locator('#result-count')).toContainText(`1 de ${catalog.length}`);
  await expect(page.locator('.ex-star')).toHaveCount(1);
  await expect(page.locator('.ex-star')).toHaveAttribute('data-id', 'US-008');
  await expect(page.locator('dialog')).not.toBeVisible();
  expect(new URL(page.url()).searchParams.has('item')).toBe(false);
  await page.reload();
  await expect(page.locator('#result-count')).toContainText(`1 de ${catalog.length}`);
  await expect(page.locator('dialog')).not.toBeVisible();
  expect(new URL(page.url()).searchParams.has('item')).toBe(false);
});

test('closing a distant work after resizing restores focus to a visible frame', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/acervo?item=FR-087'); await ready(page);
  await expect(page.locator('dialog')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator('.ex-const-field').evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(350);
  await page.keyboard.press('Escape');
  const frame = page.locator('.ex-star[data-id="FR-087"]');
  await expect(frame).toBeFocused();
  expect(await frame.evaluate(el => {
    const frame = el.getBoundingClientRect(), field = el.closest('#ex-constellation').getBoundingClientRect();
    return frame.top >= field.top && frame.bottom <= field.bottom && frame.left >= field.left && frame.right <= field.right;
  })).toBe(true);
});

test('the constellation fits 320 and 390 px screens and responds to resizing without lateral scrolling', async ({ page }) => {
  await page.goto('/acervo');
  await ready(page);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => page.locator('#ex-constellation').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('.ex-star')).toHaveCount(catalog.length);
  }
});

test('the home and empty editorial route both offer the public constellation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-actions .btn-primary')).toHaveText(/Explorar a constelação/);
  await expect(page.locator('.home-actions .btn-primary')).toHaveAttribute('href', 'acervo.html?visao=constelacao');
  await page.goto('/constelacoes');
  await expect(page.locator('#constellation-intro h1')).toHaveText('Nenhum percurso publicado');
  const explore = page.locator('#constellation-intro a');
  await expect(explore).toHaveText('Explorar a constelação do acervo');
  await expect(explore).toHaveAttribute('href', 'acervo.html?visao=constelacao');
  await explore.click();
  await ready(page);
  await expect(page.locator('#ex-constellation')).toBeVisible();
});
