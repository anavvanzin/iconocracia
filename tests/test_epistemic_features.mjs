import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSite = (rel) => readFileSync(new URL('../site/' + rel, import.meta.url), 'utf8');

test('research-links.json preserves full epistemic separation and verification fields', () => {
  const payload = JSON.parse(readSite('data/research-links.json'));
  assert.ok(Array.isArray(payload.links) && payload.links.length >= 3);
  for (const link of payload.links) {
    assert.ok(link.id && link.title_pt && link.title_en, 'link must have id and bilingual titles');
    assert.ok(link.ponta_a?.excerpt_pt && link.ponta_b?.excerpt_pt, 'link must have Ponta A and Ponta B');
    assert.ok(link.documentado_pt && link.interpretacao_pt, 'link must separate Documentado vs. Interpretação');
    assert.ok(link.limite_pt && link.objecao_pt && link.verificacao_pt, 'link must record critical limit, objection, and next verification');
  }
});

test('Homepage PT and EN mount Interactive Atlas Lens and Montage dossier links', () => {
  for (const page of ['index.html', 'en/index.html']) {
    const html = readSite(page);
    assert.match(html, /id="atlas-lens"/, `${page} must include #atlas-lens`);
    assert.match(html, /\?comparar=US-007,US-008,US-017/, `${page} must link Columbia dossier to workbench`);
    assert.match(html, /\?comparar=FR-005,FR-008/, `${page} must link France dossier to workbench`);
    assert.match(html, /\?comparar=BR-005,BR-003,BR-009/, `${page} must link Brazil dossier to workbench`);
  }
});

test('Mármore à Margem PT and EN mount Lei vs. Mármore timeline and thesis-lab.js', () => {
  for (const page of ['marmore-a-margem.html', 'en/marmore-a-margem.html']) {
    const html = readSite(page);
    assert.match(html, /id="lei-marmore-timeline"/, `${page} must include #lei-marmore-timeline`);
    assert.match(html, /thesis-lab\.js/, `${page} must load thesis-lab.js`);
    assert.match(html, /\?comparar=BR-005,BR-001,BR-002/, `${page} must link Brazilian dossier to workbench`);
  }
});

test('Sobre PT and EN mount Concept Matrix, Epistemic Ledger, and uphold 3-regimes taxonomy', () => {
  for (const page of ['sobre.html', 'en/sobre.html']) {
    const html = readSite(page);
    assert.match(html, /id="concept-matrix"/, `${page} must include #concept-matrix`);
    assert.match(html, /id="research-links-ledger"/, `${page} must include #research-links-ledger`);
    assert.match(html, /id="regimes"/, `${page} must include #regimes`);
    assert.match(html, /id="contra-alegoria"/, `${page} must include #contra-alegoria`);
    assert.doesNotMatch(html, /Four iconocratic regimes/i, `${page} must not claim 4 regimes`);
    assert.match(html, /thesis-lab\.js/, `${page} must load thesis-lab.js`);
  }
});

test('app.js renders Panofsky 3-level apparatus with qualitative status labels and ABNT/BibTeX copy', () => {
  const js = readSite('assets/app.js');
  assert.match(js, /function buildBibTeX/);
  assert.match(js, /function claimStatusLabel/);
  assert.match(js, /ex-panofsky/);
  assert.match(js, /ex-layer-section--doc/);
  assert.match(js, /ex-layer-section--reading/);
  assert.match(js, /IconocraciaCompare/);
});
