import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('../../site/data/acervo.json', import.meta.url)));
const definition = {
  slug: 'review-fixture', title: 'Percurso de teste', editorial_status: 'published',
  introduction: 'Introdução de teste.', method_note: 'Nota metodológica aprovada de teste <em>texto literal</em>.',
  item_ids: ['BR-009'],
};
const ready = page => expect(page.locator('#result-count')).toContainText(`${catalog.length} de ${catalog.length}`);

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
});

async function mockPublication(page, definitions, entries = []) {
  await page.route('**/data/constellations.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(definitions) }));
  await page.route('**/data/publication-overlay.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 1, items: entries }) }));
}

for (const mode of ['palco', 'grade']) {
  test(`switching from ${mode} selection to the closed constellation clears the work URL before reload`, async ({ page }) => {
    await page.goto(`/acervo?visao=${mode}`); await ready(page);
    if (mode === 'palco') await page.locator('.ex-next').click();
    else await page.locator('.ex-frame[data-id="US-008"]').click();
    expect(new URL(page.url()).searchParams.get('item')).toBe('US-008');
    await page.locator('#view-constelacao').click();
    await expect(page.locator('#ex-constellation')).toBeVisible();
    await expect(page.locator('dialog')).not.toBeVisible();
    expect(new URL(page.url()).searchParams.get('visao')).toBe('constelacao');
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(false);
    await page.reload(); await ready(page);
    await expect(page.locator('dialog')).not.toBeVisible();
    expect(new URL(page.url()).searchParams.has('item')).toBe(false);
  });
}

test('approved constellation method notes remain visible as literal authored text', async ({ page }) => {
  await mockPublication(page, [definition]);
  await page.goto('/constelacoes?slug=review-fixture');
  await expect(page.locator('#constellation-intro h1')).toHaveText(definition.title);
  await expect(page.locator('#constellation-intro .ex-method-note')).toHaveText(definition.method_note);
  await expect(page.locator('#constellation-intro .ex-method-note em')).toHaveCount(0);
  await expect(page.locator('#constellation-items li')).toHaveCount(1);
});

test('research navigation follows published, empty and withheld constellation availability', async ({ page }) => {
  for (const [definitions, visible] of [[ [definition], true ], [ [], false ], [ [{ ...definition, editorial_status: 'withheld' }], false ]]) {
    await mockPublication(page, definitions);
    await page.goto('/sobre');
    const link = page.locator('.ex-header [data-constellations-link]');
    await expect(link).toHaveCount(1);
    if (visible) {
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', 'constelacoes.html');
      await link.click();
      await expect(page.locator('#constellation-intro h1')).toHaveText(definition.title);
    } else await expect(link).toBeHidden();
    await expect(page.locator('body')).not.toContainText('PRIVATE');
  }
});

test('withheld, review and incomplete constellation method notes stay out of the route', async ({ page }) => {
  for (const entry of [
    { ...definition, editorial_status: 'withheld' },
    { ...definition, editorial_status: 'review' },
    { ...definition, item_ids: ['BR-009', 'missing-work'] },
  ]) {
    await mockPublication(page, [{ ...entry, method_note: 'PRIVATE METHOD SENTINEL' }]);
    await page.goto('/constelacoes?slug=review-fixture');
    await expect(page.locator('#constellation-intro h1')).toHaveText('Percurso indisponível');
    await expect(page.locator('#constellation-items li')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('PRIVATE METHOD SENTINEL');
  }
});

test('a canonical alias deep link still opens its work on the initial constellation load', async ({ page }) => {
  await mockPublication(page, [], [{ id: 'US-008', legacy_ids: ['fixture-us-alias'] }]);
  await page.goto('/acervo?item=fixture-us-alias&visao=constelacao'); await ready(page);
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.locator('#dialog-title')).toHaveText(catalog.find(item => item.id === 'US-008').titulo);
  expect(new URL(page.url()).searchParams.get('item')).toBe('US-008');
  await page.keyboard.press('Escape');
  await expect(page.locator('.ex-star[data-id="US-008"]')).toBeFocused();
  expect(new URL(page.url()).searchParams.has('item')).toBe(false);
});
