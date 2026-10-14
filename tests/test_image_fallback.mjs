import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../site/assets/app.js', import.meta.url), 'utf8');
const helpers = source.slice(source.indexOf('  const safeURL ='), source.indexOf('  const searchShortcut'));
function fixture(publication) {
  const document = { createElement: () => ({
    addEventListener(event, callback) { this[event] = callback; },
    getAttribute(name) { return this[name]; },
  }) };
  const context = vm.createContext({ document, publication, URL });
  vm.runInContext(helpers + '\nthis.reproduce = reproduce;', context);
  const stage = {
    append(img) { this.child = img; img.parentNode = this; },
    replaceChildren(child) { this.child = child; },
  };
  context.reproduce({ id: 'test', titulo: 'Test', tem_imagem: true,
    imagem: 'assets/test.webp', imagem_fonte: 'https://archive.example/reproduction.jpg' }, stage);
  return stage;
}
for (const publication of [null, {
  imageSource: item => item.imagem,
  imageURL: value => /^https?:/.test(value || '') ? value : null,
}]) {
  test(`local image failure uses source reproduction (publication=${!!publication})`, () => {
    const stage = fixture(publication);
    const img = stage.child;
    img.error();
    assert.equal(img.src, 'https://archive.example/reproduction.jpg');
    img.error();
    assert.equal(stage.child.className, 'ex-missing');
  });
  test(`detached image failure preserves replacement (publication=${!!publication})`, () => {
    const stage = fixture(publication);
    const old = stage.child;
    old.parentNode = null;
    stage.child = { src: 'replacement.webp' };
    old.error();
    assert.equal(stage.child.src, 'replacement.webp');
  });
}
