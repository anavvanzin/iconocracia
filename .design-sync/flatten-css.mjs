// Pre-build step for /design-sync (cfg.buildCmd). The converter copies
// cfg.cssEntry verbatim, so it needs one self-contained stylesheet. Since the
// web-perf audit (2026-09-28) site/assets/style.css carries the design-system
// token layers inline, so the script takes it as it is; if style.css ever goes
// back to `@import url("./design-system/styles.css")`, the token layers are
// inlined in their manifest order in place of that import. Either way the two
// ornament PNGs referenced by relative url() are swapped for the WebP copies in
// .design-sync/assets/ as data URIs. Fonts are not inlined here; pages link
// design-system/fonts/fonts.css and cfg.extraFonts ships it.
//
// Output (gitignored): .design-sync/.cache/src/mnemosyne-viva.css and an
// empty entry module the converter bundles into the tokens-only _ds_bundle.js.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dsDir = join(root, 'site/assets/design-system');
const out = join(root, '.design-sync/.cache/src');
const read = (p) => readFileSync(p, 'utf8');

const siteCss = read(join(root, 'site/assets/style.css'));
const importLine = /@import\s+url\(\s*["']?\.\/design-system\/styles\.css["']?\s*\)\s*;\s*\n?/;
let layers = [];
let body = siteCss;
if (importLine.test(siteCss)) {
  const manifest = read(join(dsDir, 'styles.css'));
  layers = [...manifest.matchAll(/@import\s+url\(\s*["']?\.\/([^"')]+)["']?\s*\)/g)]
    .map((m) => m[1])
    .filter((p) => !p.startsWith('fonts/'));
  if (!layers.length) throw new Error('no token layers found in design-system/styles.css');
  body = siteCss.replace(importLine, '');
}

// Each data URI is declared once as a custom property, so a rule repeated in
// style.css does not repeat a 160 KB URI.
const ornaments = [
  ['edelweiss-ornaments.png', 'edelweiss-ornaments.webp', '--edelweiss-sprite'],
  ['edelweiss-flower.png', 'edelweiss-flower.webp', '--edelweiss-flower'],
];
const ornamentVars = [];
for (const [png, webp, prop] of ornaments) {
  if (!body.includes(`url("${png}")`)) throw new Error(`style.css no longer references ${png}; update this script`);
  const uri = `data:image/webp;base64,${readFileSync(join(root, '.design-sync/assets', webp)).toString('base64')}`;
  ornamentVars.push(`  ${prop}: url("${uri}");`);
  body = body.split(`url("${png}")`).join(`var(${prop})`);
}

const parts = [
  '/* Mnemosyne Viva, flattened for Claude Design by .design-sync/flatten-css.mjs.',
  layers.length
    ? '   Layer 1: site/assets/design-system/tokens/* (Iuris Memoria base tokens). Layer 2: site/assets/style.css (wins). */'
    : '   Source: site/assets/style.css, which carries the Iuris Memoria token layers inline; later rules win. */',
  ...layers.map((p) => `\n/* ---- design-system/${p} ---- */\n${read(join(dsDir, p))}`),
  `\n/* ---- Edelweiss ornaments (WebP copies of site/assets/*.png) ---- */\n:root {\n${ornamentVars.join('\n')}\n}`,
  `\n/* ---- style.css ---- */\n${body}`,
];
const css = parts.join('\n');

const leftovers = [...css.matchAll(/url\(\s*["']?(?!data:|https?:|#|%23)([^"')]+)["']?\s*\)/g)].map((m) => m[1]);
if (leftovers.length) throw new Error(`unresolved relative url() in flattened CSS: ${leftovers.join(', ')}`);
if (/@import/.test(css.replace(/\/\*[\s\S]*?\*\//g, ''))) throw new Error('flattened CSS still contains an @import');

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'mnemosyne-viva.css'), css);
writeFileSync(join(out, 'entry.mjs'), 'export {};\n');
console.log(`flatten-css: ${layers.length ? `${layers.length} token layers + ` : ''}style.css -> ${(css.length / 1024).toFixed(0)} KB`);
