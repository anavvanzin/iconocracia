import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import worker from '../src/index.js';

const origin = 'https://iconocracia.com';
const site = new URL('../site/', import.meta.url);
const env = { ASSETS: { async fetch(request) {
  try { return new Response(await readFile(new URL('.' + new URL(request.url).pathname, site))); }
  catch (error) {
    if (!['ENOENT', 'EISDIR'].includes(error.code)) throw error;
    return new Response('Not found', { status: 404 });
  }
} } };

test('constellation clean routes serve the new page with the editorial cache', async () => {
  for (const path of ['/constelacoes', '/constelacoes.html']) {
    const response = await worker.fetch(new Request(origin + path), env);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300, stale-while-revalidate=86400');
    assert.match(await response.text(), /id="constellation-intro"/);
  }
});

test('constellation trailing slashes preserve requested slug and development origin', async () => {
  for (const path of ['/constelacoes/', '/constelacoes///', '/constelacoes.html/']) {
    const input = new URL('http://127.0.0.1:8787' + path + '?slug=approved&extra=a%2Fb');
    const response = await worker.fetch(new Request(input), env);
    assert.equal(response.status, 308, path);
    assert.equal(response.headers.get('Location'), 'http://127.0.0.1:8787/constelacoes' + input.search);
  }
});

test('constellation assets resolve from the clean route', async () => {
  const url = new URL('/constelacoes', origin);
  const response = await worker.fetch(new Request(url), env);
  assert.equal(response.status, 200);
  const html = await response.text();
  const assets = [...html.matchAll(/(?:href|src)="([^"\s]+)"/g)]
    .map(match => match[1]).filter(path => /\.(?:js|css)(?:\?|$)/.test(path));
  assert.ok(assets.some(path => path.startsWith('assets/constellations.js')));
  for (const reference of [...assets, 'data/constellations.json', 'data/publication-overlay.json']) {
    assert.equal((await worker.fetch(new Request(new URL(reference, url)), env)).status, 200, reference);
  }
});

test('private editorial sources are outside the deployed asset directory', async () => {
  for (const path of ['/editorial/publication.json', '/editorial/PR33-REVIEW.md', '/data/publication.json']) {
    assert.equal((await worker.fetch(new Request(origin + path), env)).status, 404, path);
  }
});
