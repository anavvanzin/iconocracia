import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const items = JSON.parse(readFileSync(new URL('../../site/data/acervo.json', import.meta.url)));
const regimes = ['Fundacional', 'Militar', 'Normativo'];
const legacy = items.filter(item => item.regime === 'Contra-alegoria');
const sortedIds = records => records.map(item => item.id).sort();
const locales = [
  { prefix: '', language: 'PT', heading: 'Três regimes iconocráticos', testHeading: 'Contra-alegoria como teste crítico',
    count: 'de', classification: 'Classificação catalogada', groups: ['Regimes interpretativos', 'Classificações legadas', 'Outros rótulos catalogados'],
    names: regimes, legacy: 'Contra-alegoria (rótulo legado)', clear: 'Limpar filtros' },
  { prefix: '/en', language: 'EN', heading: 'Three iconocratic regimes', testHeading: 'Counter-allegory as a critical test',
    count: 'of', classification: 'Cataloged classification', groups: ['Interpretive regimes', 'Legacy classifications', 'Other cataloged labels'],
    names: ['Foundational', 'Military', 'Normative'], legacy: 'Counter-allegory (legacy label)', clear: 'Clear filters' },
];

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
});

for (const locale of locales) {
  test(`${locale.language}: home and method separate three regimes from the critical test`, async ({ page }) => {
    await page.goto(locale.prefix || '/');
    await expect(page.locator('main')).toContainText(locale.prefix ? 'The three regimes' : 'Os três regimes');
    await expect(page.locator('main')).toContainText(locale.prefix ? 'is a critical test' : 'é um teste crítico');
    await expect(page.locator('main')).not.toContainText(locale.prefix ? 'The four regimes' : 'Os quatro regimes');
    await expect(page.locator('[data-stat="total"]')).toHaveText(String(items.length));
    await page.goto(`${locale.prefix}/sobre`);
    await expect(page.locator('#regimes')).toHaveText(locale.heading);
    await expect(page.locator('#regimes + p + ul li')).toHaveCount(3);
    await expect(page.locator('#contra-alegoria')).toHaveText(locale.testHeading);
    await expect(page.locator('main')).toContainText(locale.prefix ? 'ten ordinal indicators remain independent' : 'dez indicadores ordinais permanecem independentes');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test(`${locale.language}: grouped filters preserve every stored value and its exact records`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${locale.prefix}/acervo?visao=grade`);
    const count = page.locator('#result-count');
    await expect(count).toContainText(`${items.length} ${locale.count} ${items.length}`);
    const filter = page.getByRole('combobox', { name: locale.classification, exact: true });
    await expect(filter).toHaveAttribute('aria-describedby', 'classification-note');
    expect(await filter.locator(`optgroup[label="${locale.groups[0]}"] option`).allTextContents()).toEqual(locale.names);
    expect(await filter.locator(`optgroup[label="${locale.groups[1]}"] option`).allTextContents()).toEqual([locale.legacy]);
    const values = await filter.locator('option').evaluateAll(options => options.map(option => option.value));
    expect(values.filter(Boolean).sort()).toEqual([...new Set(items.map(item => item.regime).filter(Boolean))].sort());
    expect(new Set(values).size).toBe(values.length);
    for (const value of [...regimes, 'Contra-alegoria']) {
      await filter.selectOption(value);
      const expected = items.filter(item => item.regime === value);
      await expect(count).toContainText(`${expected.length} ${locale.count} ${items.length}`);
      expect(await page.locator('#ex-grid .ex-frame').evaluateAll(nodes => nodes.map(node => node.dataset.id).sort()))
        .toEqual(sortedIds(expected));
      expect(new URL(page.url()).searchParams.get('regime')).toBe(value);
    }
    await page.getByRole('button', { name: locale.clear, exact: true }).click();
    await expect(count).toContainText(`${items.length} ${locale.count} ${items.length}`);
    expect(await page.locator('#ex-grid .ex-frame').evaluateAll(nodes => nodes.map(node => node.dataset.id).sort()))
      .toEqual(sortedIds(items)); // Includes the unclassified record.
    expect(errors).toEqual([]);
  });

  test(`${locale.language}: legacy deep links, combined filters and record captions retain all fifteen labels`, async ({ page }) => {
    expect(legacy).toHaveLength(15);
    await page.goto(`${locale.prefix}/acervo?regime=Contra-alegoria&item=BR-019&visao=palco`);
    await expect(page.locator('#f-regime')).toHaveValue('Contra-alegoria');
    await expect(page.locator('#result-count')).toContainText(`15 ${locale.count} ${items.length}`);
    await expect(page.locator('#ex-metadata')).toContainText(locale.classification);
    await expect(page.locator('#ex-metadata')).toContainText(locale.legacy);
    await page.locator('#ex-open').click();
    await expect(page.locator('.ex-record')).toContainText('BR-019');
    await expect(page.locator('.ex-record')).toContainText(locale.legacy);
    await page.keyboard.press('Escape');
    await page.locator('#f-pais').selectOption('Brasil');
    const brazil = legacy.filter(item => item.pais === 'Brasil');
    await expect(page.locator('#result-count')).toContainText(`${brazil.length} ${locale.count} ${items.length}`);
    await page.reload();
    await expect(page.locator('#f-regime')).toHaveValue('Contra-alegoria');
    await expect(page.locator('#f-pais')).toHaveValue('Brasil');
    await page.locator('#q').fill('BR-019');
    await expect(page.locator('#result-count')).toContainText(`1 ${locale.count} ${items.length}`);
    await page.locator('#q').fill('no-matching-record-taxonomy');
    await expect(page.locator('#result-count')).toContainText(`0 ${locale.count} ${items.length}`);
    await page.getByRole('button', { name: locale.clear, exact: true }).click();
    await expect(page.locator('#result-count')).toContainText(`${items.length} ${locale.count} ${items.length}`);
    expect(new URL(page.url()).searchParams.has('regime')).toBe(false);
  });

  test(`${locale.language}: unknown stored labels remain searchable outside the three regimes`, async ({ page }) => {
    const extra = { ...items[0], id: 'unknown-label', regime: 'Rótulo sem regra aprovada' };
    await page.route('**/data/acervo.json', route => route.fulfill({ json: [...items, extra] }));
    await page.goto(`${locale.prefix}/acervo?visao=grade`);
    await expect(page.locator('#result-count')).toContainText(`${items.length + 1} ${locale.count} ${items.length + 1}`);
    await expect(page.locator(`#f-regime optgroup[label="${locale.groups[2]}"] option`)).toHaveText(extra.regime);
    await page.locator('#f-regime').selectOption(extra.regime);
    await expect(page.locator('#result-count')).toContainText(`1 ${locale.count} ${items.length + 1}`);
    await expect(page.locator('#ex-grid .ex-frame')).toHaveAttribute('data-id', extra.id);
  });
}
