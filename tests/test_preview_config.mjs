import assert from 'node:assert/strict';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import worker from '../src/index.js';

const root = new URL('../', import.meta.url);
const config = JSON.parse(await readFile(new URL('wrangler.jsonc', root), 'utf8'));
const site = new URL(config.assets.directory + '/', root);

test('Worker Previews opt in with only branch assets and no production resource bindings', () => {
  assert.equal(config.name, 'iconocracia');
  assert.ok(Object.hasOwn(config, 'previews'), 'wrangler preview requires an explicit previews block');
  assert.deepEqual(config.previews, {});
  assert.equal(config.assets.binding, 'ASSETS');
  for (const key of ['vars', 'kv_namespaces', 'd1_databases', 'r2_buckets', 'services',
    'durable_objects', 'queues', 'containers', 'workflows', 'hyperdrive', 'secrets_store_secrets']) {
    assert.equal(config[key], undefined, `${key} requires a separate preview access review`);
  }
});

test('the served asset root excludes editorial manifests, receipts and repository files', async () => {
  assert.equal(await realpath(site), await realpath(new URL('site/', root)));
  const env = { ASSETS: { async fetch(request) {
    const path = new URL('.' + new URL(request.url).pathname, site);
    try {
      const resolved = await realpath(path);
      if (!resolved.startsWith(fileURLToPath(site))) return new Response('Not found', { status: 404 });
      return new Response(await readFile(resolved));
    } catch (error) {
      if (!['ENOENT', 'EISDIR'].includes(error.code)) throw error;
      return new Response('Not found', { status: 404 });
    }
  } } };
  for (const path of ['/editorial/publication.json', '/editorial/PR33-REVIEW.md',
    '/editorial/.publication-state/receipt.json', '/data/publication.json',
    '/wrangler.jsonc', '/.git/config', '/api/exec']) {
    const response = await worker.fetch(new Request('https://branch-preview.example' + path), env);
    assert.equal(response.status, 404, path);
  }
  assert.equal((await worker.fetch(new Request('https://branch-preview.example/data/acervo.json'), env)).status, 200);
});
