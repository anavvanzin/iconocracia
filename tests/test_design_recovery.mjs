import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = name => readFileSync(new URL('../site/'+name, import.meta.url),'utf8');
test('editorial design and navigation survive branch reconciliation',()=>{
 const css=read('assets/style.css');
 for(const token of ['.ex-header','.phylactery','.home-opening','.ex-brand-title']) assert.ok(css.includes(token),token);
 for(const page of ['index.html','acervo.html','sobre.html']) {
  const html=read(page);
  assert.match(html,/MNEMOSYNE VIVA/);
  assert.match(html,/id="lang-toggle"/);
  assert.match(html,/rel="canonical"/);
 }
 assert.match(read('index.html'),/Os três regimes/);
 assert.match(read('sobre.html'),/id="contra-alegoria"/);
 assert.match(read('acervo.html'),/id="strand-tese"/);
 assert.match(read('assets/app.js'),/fillClassifications/);
 assert.match(read('assets/app.js'),/inThesisStrand/);
});
