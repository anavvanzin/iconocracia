import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Exercise the deployed browser helpers, not a test implementation of the gates.
const source = await readFile(new URL('../site/assets/constellations.js', import.meta.url), 'utf8');
const window = {};
vm.runInNewContext(source, { window, document: { querySelector: () => null }, URL, URLSearchParams, Map, Set });
const api = window.IconocraciaPublication;
const plain = value => JSON.parse(JSON.stringify(value));
const items = [{ id: 'canonical-a', titulo: 'Obra A' }, { id: 'canonical-b', titulo: 'Obra B' }];
const published = { slug: 'percurso', title: 'Percurso publicado', editorial_status: 'published', item_ids: ['canonical-b', 'canonical-a'] };

test('only explicitly approved analyses reach the browser renderers', () => {
  for (const status of [undefined, 'draft', 'provisional', 'under_review', 'withheld']) {
    assert.equal(api.approvedAnalysis({ status, summary: 'Texto em revisão' }), null);
    assert.equal(api.publicItems([{ ...items[0], analise_publica: { status, summary: 'Texto em revisão' } }])[0].analise_publica, undefined);
  }
  assert.equal(api.approvedAnalysis({ status: 'approved', summary: 'Texto aprovado' }).summary, 'Texto aprovado');
  assert.equal(api.approvedAnalysis({ status: 'approved', editorial_status: 'withheld', summary: 'Texto privado' }), null);
});

test('public overlay keeps the catalog IDs and ignores unknown works and unapproved analysis', () => {
  const overlay = { version: 1, items: [
    { id: 'canonical-a', legacy_ids: ['old-a'], credito: 'Arquivo', analise_publica: { status: 'draft', summary: 'Privado' } },
    { id: 'unpublished', legacy_ids: ['secret'], titulo: 'Privado' },
  ] };
  const result = api.publicItems(items, overlay);
  assert.deepEqual(plain(result.map(item => item.id)), ['canonical-a', 'canonical-b']);
  assert.equal(result[0].credito, 'Arquivo');
  assert.equal(result[0].analise_publica, undefined);
  assert.equal(api.resolveItem(result, 'secret'), null);
  assert.equal(api.resolveItem(result, 'old-a').id, 'canonical-a');
});

test('explicit review or withheld overlay records cannot expose aliases or approved-looking text', () => {
  for (const key of ['status', 'editorial_status', 'publication_status']) {
    const result = api.publicItems(items, { version: 1, items: [{ id: 'canonical-a', [key]: 'withheld', legacy_ids: ['private-alias'], credito: 'Private credit', analise_publica: { status: 'approved', summary: 'Private text' } }] });
    assert.equal(result[0].credito, undefined);
    assert.equal(result[0].analise_publica, undefined);
    assert.equal(api.resolveItem(result, 'private-alias'), null);
  }
  assert.deepEqual(plain(api.publicItems([{ ...items[0], editorial_status: 'under_review' }, items[1]]).map(item => item.id)), ['canonical-b']);
});

test('approved image, license and archive attribution replace baseline fields without mutating it', () => {
  const baseline = [{ ...items[0], imagem: 'https://old.example/work.jpg', direitos: 'Old attribution', fonte_url: 'https://old.example/catalog', tem_imagem: true }];
  const before = JSON.stringify(baseline);
  const result = api.publicItems(baseline, { version: 1, items: [{
    id: 'canonical-a', editorial_status: 'published', imagem: 'assets/licensed/work.webp',
    direitos: 'Public domain — verified archive', fonte_url: 'https://archive.example/catalog',
    imagem_fonte: 'https://archive.example/reproduction', tem_imagem: true, constelacoes: ['percurso'],
  }] });
  assert.equal(result[0].direitos, 'Public domain — verified archive');
  assert.equal(result[0].fonte_url, 'https://archive.example/catalog');
  assert.equal(result[0].imagem_fonte, 'https://archive.example/reproduction');
  assert.equal(api.imageSource(result[0]), 'assets/licensed/work.webp');
  assert.deepEqual(plain(result[0].constelacoes), ['percurso']);
  assert.equal(JSON.stringify(baseline), before);
  assert.equal(api.imageSource(api.publicItems(baseline)[0]), 'assets/acervo/canonical-a.webp');
});

test('invalid overlay source and image paths cannot replace trusted baseline metadata', () => {
  const baseline = [{ ...items[0], imagem: 'https://archive.example/work.jpg', fonte_url: 'https://archive.example/catalog', tem_imagem: true }];
  const result = api.publicItems(baseline, { version: 1, items: [{ id: 'canonical-a', imagem: '../private.webp', fonte_url: 'javascript:alert(1)', imagem_fonte: '//private.example', tem_imagem: 'yes', constelacoes: 'invalid' }] });
  assert.equal(result[0].imagem, baseline[0].imagem);
  assert.equal(result[0].fonte_url, baseline[0].fonte_url);
  assert.equal(result[0].imagem_fonte, undefined);
  assert.equal(result[0].tem_imagem, true);
  assert.equal(api.imageSource(result[0]), 'assets/acervo/canonical-a.webp');
  assert.equal(result[0].constelacoes, undefined);
});

test('image fallback permits public local assets and rejects site escapes and executable URLs', () => {
  for (const url of ['assets/new-work.webp', 'media/work.png', 'https://archive.example/work.jpg']) assert.equal(api.imageURL(url), url);
  for (const url of ['/private.jpg', '//archive.example/work.jpg', '../private.jpg', 'assets/../private.jpg', 'assets/%2e%2e/private.jpg', 'assets/%2F..%2Fprivate.jpg', 'assets\\private.jpg', 'javascript:alert(1)', 'data:image/svg+xml,test']) assert.equal(api.imageURL(url), null, url);
});

test('ambiguous aliases do not pick an arbitrary work and canonical IDs win', () => {
  const result = api.publicItems(items, { version: 1, items: [
    { id: 'canonical-a', legacy_ids: ['shared', 'canonical-b'] },
    { id: 'canonical-b', legacy_ids: ['shared'] },
  ] });
  assert.equal(api.resolveItem(result, 'shared'), null);
  assert.equal(api.resolveItem(result, 'canonical-b').id, 'canonical-b');
});

test('constellations require a published status and every ordered canonical work', () => {
  assert.deepEqual(plain(api.publishedConstellations([published], items)[0].item_ids), ['canonical-b', 'canonical-a']);
  for (const editorial_status of [undefined, 'draft', 'under_review', 'withheld']) {
    assert.equal(api.publishedConstellations([{ ...published, editorial_status }], items).length, 0);
  }
  assert.equal(api.publishedConstellations([{ ...published, publication_status: 'withheld' }], items).length, 0);
  for (const item_ids of [[], ['canonical-a', 'missing'], ['canonical-a', 'canonical-a'], ['old-a']]) {
    assert.equal(api.publishedConstellations([{ ...published, item_ids }], items).length, 0);
  }
});

test('malformed publication data and duplicate constellation slugs fail closed', () => {
  assert.deepEqual(plain(api.publishedConstellations({}, items)), []);
  assert.deepEqual(plain(api.publishedConstellations([published, { ...published, title: 'Outro percurso' }], items)), []);
  assert.equal(api.publishedConstellations([{ ...published, slug: '../private' }], items).length, 0);
  assert.deepEqual(plain(api.publicItems(items, { version: 2, items: [{ id: 'canonical-a', credito: 'Unverified' }] })), items);
});

test('work links carry canonical ID and ordered constellation context', () => {
  const link = new URL(api.workLink(items[0], 'percurso'), 'https://iconocracia.com/');
  assert.equal(link.pathname, '/acervo.html');
  assert.equal(link.searchParams.get('item'), 'canonical-a');
  assert.equal(link.searchParams.get('constelacao'), 'percurso');
});
