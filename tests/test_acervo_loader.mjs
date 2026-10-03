import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../site/assets/app.js', import.meta.url), 'utf8');
const start = source.indexOf('  async function fetchAcervo(');
const end = source.indexOf('  async function loadAcervo(');
assert.ok(start >= 0 && end > start, 'test the actual deployed loader helper');
const records = [{ id: 'test-record', titulo: 'Registro de teste', pais: 'Brasil' }];
const ok = (data = records) => ({ ok: true, json: async () => data });
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

class Clock {
  now = 0; next = 1; timers = new Map();
  setTimeout = (callback, delay) => {
    const id = this.next++;
    this.timers.set(id, { callback, at: this.now + delay });
    return id;
  };
  clearTimeout = id => this.timers.delete(id);
  advance(ms) {
    const end = this.now + ms;
    for (;;) {
      const next = [...this.timers].filter(([,timer]) => timer.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
      if (!next) break;
      this.now = next[1].at; this.timers.delete(next[0]); next[1].callback();
    }
    this.now = end;
  }
}

function loader(fetch) {
  const clock = new Clock();
  const run = vm.runInNewContext(source.slice(start, end) + '\nfetchAcervo;', {
    fetch, AbortController, Error, TypeError,
    setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
  });
  return { run, clock };
}

test('loader uses browser cache normally and reloads it for a manual retry', async () => {
  const modes = [];
  const { run, clock } = loader(async (_,options) => { modes.push(options.cache); return ok(); });
  assert.deepEqual(await run(), records);
  assert.deepEqual(await run(true), records);
  assert.deepEqual(modes, ['default','reload']);
  assert.equal(clock.timers.size, 0);
});

for (const failure of ['network', 503, 408, 429]) {
  test(`loader retries ${failure} with a fresh request`, async () => {
    const modes = [];
    const { run, clock } = loader(async (_,options) => {
      modes.push(options.cache);
      if (modes.length > 1) return ok();
      if (failure === 'network') throw new TypeError('connection reset');
      return { ok: false, status: failure };
    });
    const pending = run(); await flush(); clock.advance(250); await flush();
    assert.deepEqual(await pending, records);
    assert.deepEqual(modes, ['default','reload']);
    assert.equal(clock.timers.size, 0);
  });
}

test('loader stops after three temporary failures', async () => {
  let attempts = 0;
  const { run, clock } = loader(async () => { attempts++; return { ok: false, status: 503 }; });
  const pending = run();
  const rejected = assert.rejects(pending, /HTTP 503/);
  await flush(); clock.advance(250); await flush(); clock.advance(500); await flush();
  await rejected;
  assert.equal(attempts, 3); assert.equal(clock.timers.size, 0);
});

test('loader does not retry a permanent HTTP error', async () => {
  let attempts = 0;
  const { run, clock } = loader(async () => { attempts++; return { ok: false, status: 404 }; });
  await assert.rejects(run(), /HTTP 404/);
  assert.equal(attempts, 1); assert.equal(clock.timers.size, 0);
});

for (const [name,record] of [
  ['numeric ID',{...records[0],id:42}], ['blank ID',{...records[0],id:' '}],
  ['country type',{...records[0],pais:42}], ['motifs type',{...records[0],motivos:'invalid'}],
]) test(`loader rejects invalid ${name} before rendering`, async () => {
  let attempts = 0;
  const { run, clock } = loader(async () => { attempts++; return ok([record]); });
  await assert.rejects(run(), /Formato inválido/);
  assert.equal(attempts, 1); assert.equal(clock.timers.size, 0);
});

test('deadline remains active while the JSON body is pending', async () => {
  let attempts = 0;
  const { run, clock } = loader(async (_,options) => {
    attempts++;
    if (attempts > 1) return ok();
    return { ok: true, json: () => new Promise((_,reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    }) };
  });
  const pending = run(); await flush();
  clock.advance(7999); await flush(); assert.equal(attempts, 1);
  clock.advance(1); await flush(); clock.advance(250); await flush();
  assert.deepEqual(await pending, records);
  assert.equal(attempts, 2); assert.equal(clock.timers.size, 0);
});
