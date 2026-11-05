const fs = require("fs");
const opentype = require("opentype.js");
const cap = opentype.parse(fs.readFileSync(__dirname + "/cinzel.ttf").buffer);
const ita = opentype.parse(fs.readFileSync(__dirname + "/corm.ttf").buffer);
const M = require("./motifs.cjs");
const printDetails = require("./print-details.cjs");
const W = 800, H = 1000;

const mottos = [
  { n: "I", slug: "ex-imagine-mens", lat: ["EX IMAGINE", "MENS"], en: "From the image, the mind." },
  { n: "II", slug: "imago-superest", lat: ["IMAGO SUPEREST", "ET LOQUITUR"], en: "The image survives and speaks." },
  { n: "III", slug: "forma-manens", lat: ["FORMA MANENS,", "MEMORIA VIVENS"], en: "The remaining form, the living memory." },
  { n: "IV", slug: "pathos-in-figura", lat: ["PATHOS IN FIGURA", "SUPERSTES"], en: "The emotional intensity surviving within the form." },
  { n: "V", slug: "in-umbra-imago", lat: ["IN UMBRA IMAGO,", "IN IMAGINE VERITAS"], en: "In the shadow, the image: in the image, the truth." },
];

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

function text(font, str, cx, y, size, spacing = 0) {
  const glyphs = font.stringToGlyphs(str);
  const scale = size / font.unitsPerEm;
  let w = 0; glyphs.forEach(g => (w += g.advanceWidth * scale + spacing)); w -= spacing;
  let x = cx - w / 2, d = "";
  glyphs.forEach(g => { const f = v => (v).toFixed(2); for (const c of g.path.commands) { const X = v => f(x + v * scale), Y = v => f(y - v * scale);
      if (c.type === "M" || c.type === "L") d += c.type + X(c.x) + " " + Y(c.y);
      else if (c.type === "Q") d += "Q" + X(c.x1) + " " + Y(c.y1) + " " + X(c.x) + " " + Y(c.y);
      else if (c.type === "C") d += "C" + X(c.x1) + " " + Y(c.y1) + " " + X(c.x2) + " " + Y(c.y2) + " " + X(c.x) + " " + Y(c.y);
      else d += "Z"; } x += g.advanceWidth * scale + spacing; });
  return d;
}

function tornEdge(r) {
  const pts = [], m = 40, j = 9;
  const edge = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + (r() - .5) * (y0 === y1 ? 0 : j), y0 + (y1 - y0) * t + (r() - .5) * (x0 === x1 ? 0 : j)]); } };
  edge(m, m, W - m, m, 60); edge(W - m, m, W - m, H - m, 70); edge(W - m, H - m, m, H - m, 60); edge(m, H - m, m, m, 70);
  return "M" + pts.map(p => p.map(v => v.toFixed(1)).join(" ")).join("L") + "Z";
}

// motifs drawn in a 400x400 box centered at (400, 380)
const motifs = [
  M.eye,
  M.profile,
  M.arches,
  // IV uses a shared detailed vector drawing for every color/language variant.
  require("./nymph.cjs"),
  M.shadow,
];

const tones = { light: { paper: "#e9dfc9", ink: "#1c1915", acc: "#9c3b22" }, dark: { paper: "#151311", ink: "#e6dcc6", acc: "#c4573a" } };
const out = process.argv[2] || require("path").resolve(__dirname, "../../src/assets/plates");
fs.mkdirSync(out, { recursive: true });
mottos.forEach((m, i) => {
  for (const tone of ["light", "dark"]) for (const lang of ["latin", "bilingual"]) {
    const { paper, ink, acc } = tones[tone];
    const r = rng(i * 97 + 13);
    const big = lang === "latin" ? 0 : 1;
    let ty = 700;
    const lat = m.lat.map((l, k) => `<path d="${text(cap, l, 400, ty + k * 62, 46, 4)}" fill="${ink}"/>`).join("");
    const en = big ? `<path d="${text(ita, m.en, 400, ty + 160, 26)}" fill="${ink}" opacity=".8"/>` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="--paper:${paper}">
<defs><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="${i}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .18 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="fade"><feTurbulence type="fractalNoise" baseFrequency=".012" seed="${i + 4}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .12 0"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>
<path d="${tornEdge(r)}" fill="${paper}"/><path d="${tornEdge(rng(i * 97 + 13))}" filter="url(#grain)"/><path d="${tornEdge(rng(i * 97 + 13))}" filter="url(#fade)"/>
<rect x="70" y="56" width="90" height="28" fill="${ink}" opacity=".12" transform="rotate(-6 115 70)"/><rect x="640" y="56" width="90" height="28" fill="${ink}" opacity=".12" transform="rotate(5 685 70)"/>
<path d="${text(cap, "TAFEL " + m.n, 400, 120, 18, 6)}" fill="${acc}"/>
<line x1="330" y1="138" x2="470" y2="138" stroke="${ink}" stroke-width="1" opacity=".5"/>
${["M90 900h30M105 885v30", "M680 900h30M695 885v30"].map(d => `<path d="${d}" stroke="${ink}" stroke-width="1" opacity=".4"/>`).join("")}
${M.woodcut(motifs[i](ink, acc, paper) + printDetails(i, ink), ink)}
${lat}${en}
</svg>`;
    fs.writeFileSync(`${out}/${String(i + 1).padStart(2, "0")}-${m.slug}-${lang}-${tone}.svg`, svg);
  }
});

// ---- Printable template parts: faint copy sheets for composing new plates ----
const tpl = `${out}/templates`;
fs.mkdirSync(tpl, { recursive: true });
const g = { paper: "#ffffff", ink: "#8a8175", acc: "#b08a6e" };
const pad = n => String(n + 1).padStart(2, "0");
const wrap = inner => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${inner}</svg>`;

mottos.forEach((m, i) => {
  // Symbol: the engraved motif with its specimen diagram marks, ghost-inked.
  fs.writeFileSync(`${tpl}/${pad(i)}-${m.slug}-symbol.svg`,
    wrap(M.woodcut(motifs[i](g.ink, g.acc, g.paper), g.ink) + printDetails(i, g.ink)));

  // Motto: faint lettering with dashed baselines for hand-lettering beneath.
  let motto = m.lat.map((l, k) =>
    `<path d="${text(cap, l, 400, 700 + k * 62, 46, 4)}" fill="${g.ink}" opacity=".55"/>` +
    `<path d="M160 ${700 + k * 62 + 24} H640" stroke="${g.ink}" stroke-width=".8" opacity=".4" stroke-dasharray="2 7" fill="none"/>`).join("");
  motto += `<path d="${text(ita, m.en, 400, 860, 26)}" fill="${g.ink}" opacity=".5"/>` +
    `<path d="M180 878 H620" stroke="${g.ink}" stroke-width=".8" opacity=".35" stroke-dasharray="2 7" fill="none"/>`;
  fs.writeFileSync(`${tpl}/${pad(i)}-${m.slug}-motto-latin.svg`, wrap(motto));
  fs.writeFileSync(`${tpl}/${pad(i)}-${m.slug}-motto-bilingual.svg`, wrap(motto));

  // Framing: torn edge, tape strips, Tafel label, register marks and caption rule.
  const tape = (x, y, cx, cy, a) => `<rect x="${x}" y="${y}" width="90" height="28" fill="${g.ink}" opacity=".14" stroke="${g.ink}" stroke-width=".8" transform="rotate(${a} ${cx} ${cy})"/>`;
  const framing =
    `<path d="${tornEdge(rng(i * 97 + 13))}" fill="none" stroke="${g.ink}" stroke-width="1.4" opacity=".65"/>` +
    tape(70, 56, 115, 70, -6) + tape(640, 56, 685, 70, 5) +
    `<path d="${text(cap, "TAFEL " + m.n, 400, 120, 18, 6)}" fill="${g.acc}" opacity=".8"/>` +
    `<line x1="330" y1="138" x2="470" y2="138" stroke="${g.ink}" stroke-width="1" opacity=".45"/>` +
    ["M90 900h30M105 885v30", "M680 900h30M695 885v30"].map(d => `<path d="${d}" stroke="${g.ink}" stroke-width="1" opacity=".4" fill="none"/>`).join("") +
    `<path d="M150 942 H650" stroke="${g.ink}" stroke-width=".8" opacity=".3" stroke-dasharray="2 7" fill="none"/>`;
  fs.writeFileSync(`${tpl}/${pad(i)}-${m.slug}-framing.svg`, wrap(framing));
});
console.log("ok");
