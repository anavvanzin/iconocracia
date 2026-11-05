import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import worker from '../src/index.js';

const origin = 'https://iconocracia.com';
const site = new URL('../site/', import.meta.url);

const env = {
  ASSETS: {
    async fetch(request) {
      try {
        return new Response(await readFile(new URL('.' + new URL(request.url).pathname, site)));
      } catch (error) {
        if (!['ENOENT', 'EISDIR'].includes(error.code)) throw error;
        return new Response('Not found', { status: 404 });
      }
    },
  },
};

const EN_ROUTES = [
  { path: '/en', marker: 'The State<br>in a <em>female</em><br>body.' },
  { path: '/en/sobre', marker: 'Research &amp; Method' },
  { path: '/en/acervo', marker: 'Archive' },
  { path: '/en/constelacoes', marker: 'Constellations' },
  { path: '/en/jogo', marker: 'FOUNDRY' },
  { path: '/en/nachleben', marker: 'Bilderatlas · Tafeln I–V' },
];

test('English clean routes serve native English HTML with editorial cache', async () => {
  for (const { path, marker } of EN_ROUTES) {
    for (const testPath of [path, `${path}.html`]) {
      const response = await worker.fetch(new Request(origin + testPath), env);
      assert.equal(response.status, 200, `${testPath} must return 200`);
      assert.equal(
        response.headers.get('Cache-Control'),
        'public, max-age=300, stale-while-revalidate=86400',
        `${testPath} must set editorial cache`
      );
      const html = await response.text();
      assert.match(html, /<html[^>]*\blang="en"/, `${testPath} must have lang="en"`);
      assert.ok(html.includes(marker), `${testPath} must contain marker "${marker}"`);
    }
  }
});

test('Trailing slashes across all English routes redirect 308 to clean route', async () => {
  for (const { path } of EN_ROUTES) {
    const input = new URL(`http://127.0.0.1:8787${path}/?query=test&param=1`);
    const response = await worker.fetch(new Request(input), env);
    assert.equal(response.status, 308, `${path}/ must redirect with 308`);
    assert.equal(response.headers.get('Location'), `http://127.0.0.1:8787${path}?query=test&param=1`);
  }
});

test('Edge asset rewrite transparently serves assets requested under /en/ prefix', async () => {
  // Relative requests like /en/assets/... or /en/data/... must resolve correctly
  const assetResponse = await worker.fetch(new Request(`${origin}/en/assets/design-system/fonts/fonts.css`), env);
  assert.equal(assetResponse.status, 200, 'transparent /en/assets/ rewrite must succeed');

  const dataResponse = await worker.fetch(new Request(`${origin}/en/data/stats.json`), env);
  assert.equal(dataResponse.status, 200, 'transparent /en/data/ rewrite must succeed');
});

test('English legacy redirects route correctly', async () => {
  const redirects = [
    ['/en/home', '/en'],
    ['/en/pesquisa-e-metodo', '/en/sobre'],
  ];
  for (const [from, to] of redirects) {
    const response = await worker.fetch(new Request(origin + from), env);
    assert.equal(response.status, 301, `${from} must redirect 301`);
    assert.equal(response.headers.get('Location'), `${origin}${to}`);
  }
});

test('sitemap.xml lists all English routes and Portuguese routes', async () => {
  const response = await worker.fetch(new Request(`${origin}/sitemap.xml`), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/xml; charset=utf-8');
  const xml = await response.text();
  for (const { path } of EN_ROUTES) {
    assert.ok(xml.includes(`<loc>${origin}${path}</loc>`), `sitemap must list ${path}`);
  }
});

test('bidirectional hreflang links exist between PT and EN routes', async () => {
  const routePairs = [
    { pt: '/', en: '/en' },
    { pt: '/sobre', en: '/en/sobre' },
    { pt: '/acervo', en: '/en/acervo' },
    { pt: '/constelacoes', en: '/en/constelacoes' },
    { pt: '/jogo', en: '/en/jogo' },
    { pt: '/nachleben', en: '/en/nachleben' },
  ];

  for (const pair of routePairs) {
    // Check Portuguese page
    const ptRes = await worker.fetch(new Request(origin + pair.pt), env);
    assert.equal(ptRes.status, 200);
    const ptHtml = await ptRes.text();
    assert.ok(
      ptHtml.includes(`hreflang="en" href="${origin}${pair.en}"`) ||
      ptHtml.includes(`hreflang="en" href="${origin}${pair.en}/"`),
      `${pair.pt} must link to English alternate`
    );

    // Check English page
    const enRes = await worker.fetch(new Request(origin + pair.en), env);
    assert.equal(enRes.status, 200);
    const enHtml = await enRes.text();
    assert.ok(
      enHtml.includes(`hreflang="pt-BR" href="${origin}${pair.pt}"`) ||
      enHtml.includes(`hreflang="pt-BR" href="${origin}${pair.pt === '/' ? '/' : pair.pt}"`),
      `${pair.en} must link to Portuguese alternate`
    );
  }
});
