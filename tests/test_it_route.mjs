import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import worker from '../src/index.js';

const origin = 'https://iconocracia.com';
const site = new URL('../site/', import.meta.url);
const env = { ASSETS: { async fetch(request) {
  try {
    const pathname = new URL(request.url).pathname;
    return new Response(await readFile(new URL('.' + pathname, site)),
      { headers: { 'Content-Type': pathname.endsWith('.html') ? 'text/html' : 'application/octet-stream' } });
  } catch (error) {
    if (!['ENOENT', 'EISDIR'].includes(error.code)) throw error;
    return new Response(null, { status: 404 });
  }
} } };

test('Italian introduction is a standalone canonical route', async () => {
  const page = await worker.fetch(new Request(origin + '/it/'), env);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('Content-Type'), /text\/html/);
  const html = await page.text();
  assert.match(html, /<html lang="it">/);
  assert.match(html, /rel="canonical" href="https:\/\/iconocracia\.com\/it\/"/);
  assert.match(html, /href="\/acervo" hreflang="pt-BR"/);
  assert.doesNotMatch(html, /\b145\b/);
  for (const path of ['/it', '/it.html', '/it/index', '/it/index.html']) {
    const alias = await worker.fetch(new Request(origin + path + '?test=1'), env);
    assert.equal(alias.status, 308, path);
    assert.equal(alias.headers.get('Location'), origin + '/it/?test=1');
  }
  const unknown = await worker.fetch(new Request(origin + '/it/acervo'), env);
  assert.equal(unknown.status, 404);
});

test('sitemap includes Italian introduction without replacing existing routes', async () => {
  const res = await worker.fetch(new Request(origin + '/sitemap.xml'), env);
  const xml = await res.text();
  for (const path of ['/', '/acervo', '/en', '/it/']) assert.ok(xml.includes('<loc>' + origin + path + '</loc>'));
});
