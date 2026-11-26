import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { window: {}, URL };
vm.runInNewContext(
  readFileSync(new URL('../site/assets/compare-workbench.js', import.meta.url), 'utf8'),
  sandbox,
);
const compare = sandbox.window.IconocraciaCompare;

test('parseCompareParam deduplicates, trims, and caps at 3 IDs', () => {
  assert.deepEqual(Array.from(compare.parseCompareParam('')), []);
  assert.deepEqual(Array.from(compare.parseCompareParam(null)), []);
  assert.deepEqual(
    Array.from(compare.parseCompareParam(' BR-005 , FR-008 , BR-005 , US-008 , DE-001 ')),
    ['BR-005', 'FR-008', 'US-008'],
  );
});

test('sharedMotifs detects motifs shared by at least two items (accent-insensitive)', () => {
  const shared = compare.sharedMotifs([
    { id: 'A', motivos: ['República', 'Barrete frígio', 'Positivismo'] },
    { id: 'B', motivos: ['Republica', 'Espada'] },
    { id: 'C', motivos: ['Balança', 'Barrete frigio'] },
  ]);
  assert.equal(shared.has('republica'), true);
  assert.equal(shared.has('barrete frigio'), true);
  assert.equal(shared.has('espada'), false);
  assert.equal(shared.has('positivismo'), false);
});

test('buildCompareURL sets or clears ?comparar= cleanly', () => {
  const withIds = compare.buildCompareURL(['BR-005', 'FR-008'], 'https://iconocracia.com/acervo?visao=grade');
  assert.equal(withIds, 'https://iconocracia.com/acervo?visao=grade&comparar=BR-005%2CFR-008');

  const cleared = compare.buildCompareURL([], withIds);
  assert.equal(cleared, 'https://iconocracia.com/acervo?visao=grade');
});

test('PT and EN archive pages wire Mesa de Montagem controls and script', () => {
  for (const rel of ['../site/acervo.html', '../site/en/acervo.html']) {
    const html = readFileSync(new URL(rel, import.meta.url), 'utf8');
    assert.match(html, /id="ex-compare-toggle"/, `${rel} must include #ex-compare-toggle`);
    assert.match(html, /id="ex-compare-tray"/, `${rel} must include #ex-compare-tray`);
    assert.match(html, /compare-workbench\.js/, `${rel} must load compare-workbench.js`);
  }
});
