import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const items = JSON.parse(readFileSync(new URL('../../site/data/acervo.json', import.meta.url)));
const regimes = ['Fundacional', 'Militar', 'Normativo'];
const legacy = items.filter(item => item.regime === 'Contra-alegoria');
const sortedIds = records => records.map(item => item.id).sort();

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
});

test('home and method distinguish three regimes from the critical test', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main')).toContainText('Os três regimes');
  await expect(page.locator('main')).toContainText('é um teste crítico');
  await expect(page.locator('main')).not.toContainText('Os quatro regimes');
  await expect(page.locator('[data-stat="total"]')).toHaveText(String(items.length));
  await page.goto('/sobre');
  await expect(page.locator('#regimes')).toHaveText('Três regimes iconocráticos');
  await expect(page.locator('#regimes + p + ul li')).toHaveCount(3);
  await expect(page.locator('#contra-alegoria')).toHaveText('Contra-alegoria como teste crítico');
  await expect(page.locator('main')).toContainText('Qualquer reclassificação exige uma regra metodológica');
});

test('filter groups preserve all stored values and counts for each regime and legacy label', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/acervo?visao=grade');
  await expect(page.locator('#result-count')).toContainText(`${items.length} de ${items.length}`);
  const filter = page.getByRole('combobox', { name: 'Classificação catalogada', exact: true });
  await expect(filter).toHaveAttribute('aria-describedby', 'classification-note');
  expect(await filter.locator('optgroup[label="Regimes interpretativos"] option').allTextContents()).toEqual(regimes);
  expect(await filter.locator('optgroup[label="Classificações legadas"] option').allTextContents())
    .toEqual(['Contra-alegoria (rótulo legado)']);
  const values = await filter.locator('option').evaluateAll(options => options.map(option => option.value));
  expect(values.filter(Boolean).sort()).toEqual([...new Set(items.map(item => item.regime).filter(Boolean))].sort());
  expect(new Set(values).size).toBe(values.length);
  for (const value of [...regimes, 'Contra-alegoria']) {
    await filter.selectOption(value);
    const expected = items.filter(item => item.regime === value);
    await expect(page.locator('#result-count')).toContainText(`${expected.length} de ${items.length}`);
    expect(await page.locator('#ex-grid .ex-frame').evaluateAll(nodes => nodes.map(node => node.dataset.id).sort()))
      .toEqual(sortedIds(expected));
    expect(new URL(page.url()).searchParams.get('regime')).toBe(value);
  }
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await expect(page.locator('#result-count')).toContainText(`${items.length} de ${items.length}`);
  expect(await page.locator('#ex-grid .ex-frame').evaluateAll(nodes => nodes.map(node => node.dataset.id).sort()))
    .toEqual(sortedIds(items)); // Includes the unclassified record.
  expect(errors).toEqual([]);
});

test('legacy deep links, combined filters, reloads and record captions keep the fifteen records', async ({ page }) => {
  expect(legacy).toHaveLength(15);
  await page.goto('/acervo?regime=Contra-alegoria&item=BR-019&visao=palco');
  await expect(page.locator('#f-regime')).toHaveValue('Contra-alegoria');
  await expect(page.locator('#result-count')).toContainText(`15 de ${items.length}`);
  await expect(page.locator('#ex-metadata')).toContainText('Classificação catalogada');
  await expect(page.locator('#ex-metadata')).toContainText('Contra-alegoria (rótulo legado)');
  await page.locator('#ex-open').click();
  await expect(page.locator('.ex-record')).toContainText('BR-019');
  await expect(page.locator('.ex-record')).toContainText('Contra-alegoria (rótulo legado)');
  await page.keyboard.press('Escape');
  await page.locator('#f-pais').selectOption('Brasil');
  const brazil = legacy.filter(item => item.pais === 'Brasil');
  await expect(page.locator('#result-count')).toContainText(`${brazil.length} de ${items.length}`);
  await page.reload();
  await expect(page.locator('#f-regime')).toHaveValue('Contra-alegoria');
  await expect(page.locator('#f-pais')).toHaveValue('Brasil');
  await expect(page.locator('#result-count')).toContainText(`${brazil.length} de ${items.length}`);
  await page.locator('#q').fill('BR-019');
  await expect(page.locator('#result-count')).toContainText(`1 de ${items.length}`);
  await page.locator('#q').fill('no-matching-record-taxonomy');
  await expect(page.locator('#result-count')).toContainText(`0 de ${items.length}`);
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await expect(page.locator('#result-count')).toContainText(`${items.length} de ${items.length}`);
  expect(new URL(page.url()).searchParams.has('regime')).toBe(false);
});

test('unrecognized stored labels stay filterable outside the three regimes', async ({ page }) => {
  const extra = { ...items[0], id: 'unknown-label', regime: 'Rótulo sem regra aprovada' };
  await page.route('**/data/acervo.json', route => route.fulfill({ json: [...items, extra] }));
  await page.goto('/acervo?visao=grade');
  await expect(page.locator('#result-count')).toContainText(`${items.length + 1} de ${items.length + 1}`);
  await expect(page.locator('#f-regime optgroup[label="Outros rótulos catalogados"] option')).toHaveText(extra.regime);
  await page.locator('#f-regime').selectOption(extra.regime);
  await expect(page.locator('#result-count')).toContainText(`1 de ${items.length + 1}`);
  await expect(page.locator('#ex-grid .ex-frame')).toHaveAttribute('data-id', extra.id);
});
