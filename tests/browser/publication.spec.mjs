import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('../../site/data/acervo.json', import.meta.url)));
const columbia = JSON.parse(readFileSync(new URL('../../site/data/constellations.json', import.meta.url))).find(entry => entry.slug === 'columbia-dois-chamados');
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

test('the corrected Germania record distinguishes printed date and reprints in the currency filter', async ({ page }) => {
  await page.goto('/acervo?item=DE-100M-1908&visao=palco');
  await expect(page.locator('#ex-metadata')).toContainText('Moeda e cédula');
  await page.locator('#f-tipo').selectOption('Moeda e cédula');
  await expect(page.locator('#ex-title')).toContainText('Germania em medalhão');
  await page.locator('#ex-open').click();
  const record = page.locator('.ex-record');
  await expect(record).toContainText('Paul Thumann (desenho); Hans Meyer (gravura)');
  await expect(record).toContainText('data impressa: 7 fev. 1908; reimpressões: 1918–1922');
  await expect(record).toContainText('data exata de produção do exemplar fotografado: [VERIFICAR]');
  await expect(record).toContainText('alegorias da indústria e da agricultura');
  await expect(record).toContainText('DEUTSCHE BUNDESBANK');
  await expect(record).toContainText('STATISTISCHES AMT DER STADT NÜRNBERG');
});

test('the real public artifact publishes only the approved Columbia reading and ordered works', async ({ page }) => {
  const slug = 'columbia-dois-chamados';
  const title = 'Columbia — dois chamados da nação';
  const ids = ['US-008', '473ac4d7-a507-51c6-8215-983c2442fc23'];
  const works = ids.map(id => catalog.find(item => item.id === id));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/constelacoes/');
  expect(new URL(page.url()).pathname).toBe('/constelacoes');
  await expect(page.locator('#constellation-intro h1')).toHaveText(title);
  await expect(page.locator('.constellation-period')).toHaveText('Sufrágio e recrutamento nos Estados Unidos, 1913–1917');
  await expect(page.locator('.constellation-deck')).toHaveText('Nas duas reproduções, Columbia ocupa posição dominante, com vestes longas, emblemas nacionais e um braço estendido. Reicher porta capacete e couraça diante de outras participantes; no cartaz, a figura ergue a bandeira, segura uma espada e se apoia sobre a América do Norte no globo. A fotografia registra a encenação sufragista de 3 de março de 1913, diante do edifício do Tesouro, em Washington. O cartaz convoca ao alistamento no Exército; segundo a Library of Congress, Halsted doou o poema e o desenho ao Departamento de Guerra após a entrada dos Estados Unidos na guerra, em 6 de abril de 1917. A mesma personificação nacional participa de mobilizações com finalidades distintas. A montagem permite perguntar quem pode falar em nome da nação e o que essa voz exige. A couraça de Reicher mostra que atributos marciais também podiam servir à reivindicação sufragista.');
  await expect(page.locator('#constellation-intro .ex-method-note')).toHaveText('O elo visual e os contextos estão documentados nos registros 97510759 e 95506508 da Library of Congress; influência direta entre as imagens não foi demonstrada. A comparação preserva a diferença entre encenação fotografada e imagem impressa, sem estabelecer uma sequência evolutiva. O acervo indica 1917 para o cartaz; o catálogo institucional registra c1916. A doação em 1917 é uma etapa distinta e não determina, sozinha, a data de impressão do exemplar. Leitura baseada em reproduções digitais.');
  await expect(page.locator('[data-constellations-link]')).toBeVisible();
  await expect(page.locator('#constellation-items li')).toHaveCount(2);
  await expect(page.locator('#constellation-items h2')).toHaveText([
    'Hedwig Reicher as Columbia in suffrage pageant',
    'Columbia calls—Enlist now for U.S. Army',
  ]);
  await expect(page.locator('#constellation-items .constellation-number')).toHaveText(['01', '02']);
  const hrefs = await page.locator('#constellation-items a').evaluateAll(links => links.map(link => link.getAttribute('href')));
  expect(hrefs.map(href => {
    const params = new URL(href, 'https://iconocracia.com').searchParams;
    return [params.get('item'), params.get('constelacao')];
  })).toEqual(ids.map(id => [id, slug]));
  for (let index = 0; index < works.length; index++) {
    const card = page.locator('#constellation-items li').nth(index);
    await expect(card.locator('img')).toHaveAttribute('src', `assets/acervo/${ids[index]}.webp`);
    const approvedCard = columbia.cards[index];
    expect(approvedCard.id).toBe(ids[index]);
    await expect(card.locator('img')).toHaveAttribute('alt', approvedCard.texto_alternativo);
    await expect.poll(() => card.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(card.locator('figcaption p').last()).toHaveText(approvedCard.caption);
  }
  await expect(page.locator('#constellation-switcher a')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Constituições atlânticas');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto(`/acervo?item=${ids[0]}&constelacao=${slug}&visao=palco`);
  await expect(page.locator('#result-count')).toContainText('2 de 2 obras');
  await expect(page.locator('#ex-curatorial-context')).toHaveText(`Percurso: ${title}`);
  for (let index = 0; index < works.length; index++) {
    await expect(page.locator('#ex-title')).toHaveText(works[index].titulo);
    expect(new URL(page.url()).searchParams.get('item')).toBe(ids[index]);
    expect(new URL(page.url()).searchParams.get('constelacao')).toBe(slug);
    await page.locator('#ex-open').click();
    await expect(page.locator('.ex-analysis')).toHaveCount(0);
    await page.keyboard.press('Escape');
    if (index === 0) await page.locator('.ex-next').click();
  }

  await page.goto('/constelacoes?slug=constituicoes-atlanticas');
  await expect(page.locator('#constellation-intro h1')).toHaveText('Percurso indisponível');
  await expect(page.locator('#constellation-items li')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Entre a Revolução Francesa e o cinquentenário belga');
  for (const id of ['BR-009', '324a90b6-403b-5b36-9bcf-d4c4db9efdc1', 'BE-004']) {
    await page.goto(`/acervo?item=${id}&visao=palco`);
    await expect(page.locator('#result-count')).toContainText(`${catalog.length} de ${catalog.length}`);
    expect(new URL(page.url()).searchParams.get('item')).toBe(id);
    await page.locator('#ex-open').click();
    await expect(page.locator('#dialog-title')).toHaveText(catalog.find(item => item.id === id).titulo);
    await expect(page.locator('.ex-analysis')).toHaveCount(0);
  }
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
