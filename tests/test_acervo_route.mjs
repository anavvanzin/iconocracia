import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import worker from '../src/index.js';

const site = new URL('../site/', import.meta.url);
const origin = 'https://iconocracia.com';
const search = '?item=US-008&q=suffrage&pais=Estados+Unidos&visao=grade&extra=a%2Fb%2Bc&extra=again';

// Use the repository's real HTML and assets; absent paths must return 404.
const env = {
  ASSETS: {
    async fetch(request) {
      const path = new URL(request.url).pathname;
      try {
        return new Response(await readFile(new URL('.' + path, site)));
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error;
        return new Response('Not found', { status: 404 });
      }
    },
  },
};

async function followPage(input) {
  let url = new URL(input);
  let response = await worker.fetch(new Request(url), env);
  if (response.status >= 300 && response.status < 400) {
    url = new URL(response.headers.get('Location'), url);
    response = await worker.fetch(new Request(url), env);
  }
  assert.equal(response.status, 200, 'the canonical page must be served without a redirect loop');
  return { url, html: await response.text() };
}

test('acervo trailing slashes redirect with selection, filters and encoded query intact', async () => {
  for (const pathname of ['/acervo/', '/acervo///', '/acervo.html/']) {
    const input = new URL(pathname + search, origin);
    const response = await worker.fetch(new Request(input), env);
    assert.equal(response.status, 308);
    const location = new URL(response.headers.get('Location'));
    assert.equal(location.origin, input.origin);
    assert.equal(location.pathname, '/acervo');
    assert.equal(location.search, input.search);
    assert.equal(location.searchParams.get('item'), 'US-008');
    assert.equal(location.searchParams.get('q'), 'suffrage');
    assert.equal(location.searchParams.get('pais'), 'Estados Unidos');
    assert.equal(location.searchParams.get('visao'), 'grade');
    assert.deepEqual(location.searchParams.getAll('extra'), ['a/b+c', 'again']);
  }
});

test('following /acervo/ resolves its actual script, CSS and collection JSON to HTTP 200', async () => {
  const { url, html } = await followPage(origin + '/acervo/' + search);
  const references = [...html.matchAll(/(?:href|src)="([^"\s]+)"/g)]
    .map((match) => match[1])
    .filter((path) => /\.(?:js|css)(?:\?|$)/.test(path));
  assert.ok(references.some((path) => path.startsWith('assets/app.js')));
  assert.ok(references.some((path) => path.startsWith('assets/style.css')));
  for (const reference of [...references, 'data/acervo.json']) {
    const response = await worker.fetch(new Request(new URL(reference, url)), env);
    assert.equal(response.status, 200, reference + ' must resolve after navigation');
  }
});

test('root pages and asset paths keep their existing routes', async () => {
  for (const path of ['/', '/acervo', '/acervo.html', '/sobre', '/assets/app.js', '/assets/style.css', '/data/acervo.json']) {
    const response = await worker.fetch(new Request(origin + path), env);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('Location'), null, path + ' must not redirect');
  }
  assert.equal((await worker.fetch(new Request(origin + '/acervo/data/acervo.json'), env)).status, 404);
});

test('acervo canonicalization retains the development origin', async () => {
  const input = 'http://127.0.0.1:8787/acervo/' + search;
  const response = await worker.fetch(new Request(input), env);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('Location'), 'http://127.0.0.1:8787/acervo' + search);
});
