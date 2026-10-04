import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('../../site/data/acervo.json', import.meta.url)));
const selected = ['US-008', 'BR-009'];
const definition = { slug: 'test-approved', title: 'Percurso de teste', editorial_status: 'published', item_ids: selected };
const approved = { status: 'approved', approved_by: 'fixture', approved_at: '2026-10-04', summary: 'Leitura aprovada de teste.', panofsky: { level_1: 'Descrição de teste.' } };

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
});

async function mockPublication(page, definitions, entries = []) {
  await page.route('**/data/constellations.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(definitions) }));
  await page.route('**/data/publication-overlay.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 1, items: entries }) }));
}

test('the real public artifact has no pending constellation or editorial analysis', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/constelacoes/');
  await expect(page.locator('#constellation-intro h1')).toHaveText('Nenhum percurso publicado');
  await expect(page.locator('#constellation-items li')).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe('/constelacoes');
  await page.goto('/acervo?item=BR-009&visao=palco');
  await expect(page.locator('#result-count')).toContainText(`${catalog.length} de ${catalog.length}`);
  await page.locator('#ex-open').click();
  await expect(page.locator('.ex-analysis')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('review, withheld and incomplete definitions cannot expose text in a preview', async ({ page }) => {
  for (const entry of [
    { ...definition, editorial_status: 'review', introduction: 'PRIVATE REVIEW SENTINEL' },
    { ...definition, editorial_status: 'withheld', introduction: 'PRIVATE WITHHELD SENTINEL' },
    { ...definition, item_ids: ['BR-009', 'unknown'], introduction: 'PRIVATE INCOMPLETE SENTINEL' },
  ]) {
    await mockPublication(page, [entry]);
    await page.goto('/constelacoes?slug=test-approved');
    await expect(page.locator('#constellation-intro h1')).toHaveText('Percurso indisponível');
    await expect(page.locator('#constellation-items li')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('PRIVATE');
  }
});

test('canonical aliases, ordered next work and approved analysis share the same context', async ({ page }) => {
  await mockPublication(page, [definition], [
    { id: 'US-008', legacy_ids: ['test-old-us'], analise_publica: approved },
    { id: 'BR-009', analise_publica: { status: 'draft', summary: 'PRIVATE DRAFT SENTINEL' } },
  ]);
  await page.goto('/acervo?item=test-old-us&constelacao=test-approved&visao=palco');
  await expect(page.locator('#ex-title')).toHaveText(catalog.find(item => item.id === 'US-008').titulo);
  expect(new URL(page.url()).searchParams.get('item')).toBe('US-008');
  await expect(page.locator('#ex-curatorial-context')).toContainText(definition.title);
  await expect(page.locator('#result-count')).toContainText('2 de 2 obras');
  await page.locator('#ex-open').click();
  await page.locator('.ex-analysis summary').click();
  await expect(page.locator('.ex-analysis')).toContainText(approved.summary);
  await expect(page.locator('.ex-analysis')).toContainText(approved.panofsky.level_1);
  await page.keyboard.press('Escape');
  await page.locator('.ex-next').click();
  await expect(page.locator('#ex-title')).toHaveText('A Justiça');
  expect(new URL(page.url()).searchParams.get('item')).toBe('BR-009');
  expect(new URL(page.url()).searchParams.get('constelacao')).toBe(definition.slug);
  await page.locator('#ex-open').click();
  await expect(page.locator('.ex-analysis')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('PRIVATE DRAFT');
});

test('approved constellation list preserves declared order and unknown slug stays unavailable', async ({ page }) => {
  await mockPublication(page, [definition]);
  await page.goto('/constelacoes?slug=test-approved');
  await expect(page.locator('#constellation-items li')).toHaveCount(2);
  const hrefs = await page.locator('#constellation-items a').evaluateAll(links => links.map(link => link.getAttribute('href')));
  expect(hrefs.map(href => new URL(href, 'https://iconocracia.com').searchParams.get('item'))).toEqual(selected);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto('/constelacoes?slug=unknown');
  await expect(page.locator('#constellation-intro h1')).toHaveText('Percurso indisponível');
  await expect(page.locator('#constellation-items li')).toHaveCount(0);
});
