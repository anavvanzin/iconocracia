import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const site = new URL('../site/', import.meta.url);
const runtime = await readFile(new URL('assets/constellation-field.js', site), 'utf8');
const themedPages = [];
for (const path of await readdir(site, { recursive: true })) {
  if (!path.endsWith('.html')) continue;
  const html = await readFile(new URL(path, site), 'utf8');
  if (html.includes('constellation-field.js')) themedPages.push({ path, html });
}

test('theme regression coverage includes every current themed page', () => {
  assert.deepEqual(themedPages.map(page => page.path).sort(),
    ['404.html', 'acervo.html', 'constelacoes.html', 'index.html', 'sobre.html']);
});

for (const { path, html } of themedPages) {
  const initializer = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .find(match => match[2].includes('iconocracia-modo'));

  test(`${path}: theme is decided synchronously before styles`, () => {
    assert.ok(initializer, 'missing head initializer');
    assert.doesNotMatch(initializer[1], /\b(?:src|defer|async)\b/);
    assert.ok(initializer.index < html.indexOf('</head>'));
    assert.ok(initializer.index < html.search(/<link\b[^>]*rel=["']stylesheet["']/));
  });

  for (const dark of [true, false]) {
    for (const storage of ['getItem throws', 'localStorage getter throws', null, 'invalid', 'dia', 'noite']) {
      test(`${path}: ${dark ? 'dark' : 'light'} system, storage ${storage}`, () => {
        let theme = null;
        const root = {
          setAttribute(name, value) { if (name === 'data-theme') theme = value; },
          removeAttribute(name) { if (name === 'data-theme') theme = null; },
          getAttribute() { return theme; },
        };
        const toggle = { textContent: '', setAttribute() {}, addEventListener() {} };
        const context = {
          document: { documentElement: root, getElementById: () => toggle, querySelector: () => null },
          matchMedia(query) {
            assert.equal(query, '(prefers-color-scheme: dark)');
            return { matches: dark };
          },
        };
        Object.defineProperty(context, 'localStorage', { get() {
          if (storage === 'localStorage getter throws') throw new Error('SecurityError');
          return { getItem(key) {
            assert.equal(key, 'iconocracia-modo');
            if (storage === 'getItem throws') throw new Error('SecurityError');
            return storage;
          } };
        } });
        context.window = context;
        vm.createContext(context);
        const expected = storage === 'noite' || (storage !== 'dia' && dark) ? 'noite' : null;
        vm.runInContext(initializer[2], context);
        assert.equal(theme, expected, 'theme must already be correct before the deferred script');
        vm.runInContext(runtime, context);
        assert.equal(theme, expected, 'deferred script must preserve the initial theme');
        assert.equal(toggle.textContent, expected === 'noite' ? 'DIA' : 'NOITE');
      });
    }
  }
}
