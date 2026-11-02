# Design Specification: ICONOCRACIA / ANIMA Remake — Astro Content Collections & Counter-Archive Architecture

**Date:** 2026-11-02  
**Author:** Ana Vitória Vanzin Mendes (with Antigravity)  
**Target Repository:** `/Users/anavanzin/Recuperacao/Projetos/iconocracia` (`anavvanzin/iconocracia`, live at `https://iconocracia.com`)  
**Upstream Corpus Repository:** `/Users/anavanzin/Projetos/iconocracy-corpus`

---

## 1. Intent and the Why

`iconocracia.com` is transitioning from a static, flat JSON catalogue where documented artifact fields and interpretive claims sit mixed inside single object records into a rigorous, long-lived **Legal Iconology Index and Counter-Archive**.

The core intellectual premise of the platform is two-fold:
1. **Strict Epistemic Separation:** What is materially documented (`Object`, `Image`, `Source`) must never be conflated in the data model with what is interpreted (`Claim`, `Concept`, `Constellation`, `Essay`).
2. **The Counter-Archive Interface (Dual-Axis Confrontation):** Traditional art-historical indexing (such as standard Iconclass notations: `31AA` female human figure, `44G0` allegory of jurisprudence, `48C24` sculpture/metal die, `44B` state symbol) presents itself as neutral administrative cataloging while remaining blind to the legal-political operation of state imagery. Each artifact detail page stages a visual and structural confrontation between:
   - **Left Axis — The Facade (Documented Catalogue & Standard Iconclass):** What exists, where it is held, its ABNT NBR 6023:2025 `Source`, pre-iconographic `observed_motifs`, and passive Iconclass notations.
   - **Right Axis — The Operation (Critical Realignment & Claims):** Separate, citable `Claim` and `Concept` records exposing the political and legal operation (*Contrato Sexual Visual*, *Feminilidade de Estado*, *Purificação Clássica / Mármore à Margem*, *Contrato Racial Visual*, and the *hystera → matrix / matriz* triad).

At the same time, the doctoral dissertation on **Brazil (1822–1922)** is modeled as one bounded **Strand** within the broader transnational atlas (`1800–2000`), keeping the atlas open for future research lines without letting a single period or geography silently become the boundary of the whole platform.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Executable Content Model in Astro (Option B):** Use Astro Content Collections with strict JSON Schema / Zod validation at build time so that `Object`, `Image`, `Source`, `Claim`, `Concept`, `Constellation`, `Essay`, `Experiment`, and `Strand` are distinct, cross-referenced collections. A `Claim` with `epistemic_status: "documented"` that lacks a valid `Source` + locator fails the build.
- **Per-Record Citable URLs & Full Sitemap:** Replace query-string addressing (`acervo.html?item=BR-009`) with permanent, statically generated routes (`/acervo/BR-009`, `/constelacoes/columbia-dois-chamados`, `/conceitos/contrato-sexual-visual`, `/trilhas/brasil-1822-1922`) while preserving 301 redirects from legacy `?item=` URLs.
- **Counter-Archive Dual-Axis Artifact Page with Progressive X-Ray Toggle:** Support both reader journeys (the empirical legal historian seeking raw documented data and the critical theorist exploring the Counter-Archive) with a dual-axis layout and Warburgian Temporal Coexistence Controller.
- **Protected Color & Typographic Palettes with Reopened Visual Identity:** Preserve the established color and typographic tokens (`Iuris Memoria` / `Selo-Cartela · Lacre` in `style.css` — warm vellum `#EFE5CF`, iron-gall ink `#1A1612`, indigo `#1B2B4A`, lacre `#A8281F`, terracotta `#A04030`, gold `#B8924A`, amethyst `#8A5FA8` — alongside the `AGENTS.md` exhibition lavender `#B99AEE` and acid-yellow `#E4FF38` palette tokens, and the three typographic voices: `Instrument Serif`, `Crimson Pro`, and `JetBrains Mono`), while redesigning the spatial layout, Counter-Archive dual grid, and constellation canvas.
- **ABNT NBR 6023:2025 Structured Sources:** Generate `citation_abnt` deterministically from structured `Source` fields (including 2025 updates: `e-localização`, complementary `ISSN`, and `julgado em` for jurisprudence) rather than relying on hand-typed strings or title-only placeholders.

### Non-Goals
- **No Live AI Inference on `iconocracia.com`:** The public Worker remains a pure static-asset and routing layer (`ASSETS` binding). Gemini / Genkit flows remain strictly in the private workbench (`scholar-desk`) and offline preparation scripts.
- **No Third-Party Headless CMS Lock-In:** Canonical records remain in Git as versioned JSON/YAML and Markdown/MDX files subject to SHA-256 publication gates.

### Anti-Goals (What Would Make This a Failure Even If It Works Technically)
- **Never Expose Internal Pipeline Metadata:** Legacy internal pipeline provenance tags (`coded_by` or per-instrument record counts) must **never** appear in schemas, converted datasets, public UI, public JSON payloads, or editorial reports. All published claims carry unified scholarly authorship under the project's editorial gate (`review_state: "approved"` vs. unpublished `draft`).
- **Never Present Unreviewed Extractions as Settled Findings:** Claims extracted from legacy `panofsky.interpretation[]`, `regime_justificativa`, or `hipotese_racial` that have not passed editorial approval enter the repository with `review_state: "draft"` and `epistemic_status: "hypothesis"`, remaining hidden from public pages until explicitly promoted to `review_state: "approved"`.
- **Never Use Decorative Network Graphs or Composite Scores:** Legacy `purificacao_composto` / numeric composite scores remain retired (`DEC-2026-09-24`) and hidden from public interfaces in favor of isolated ordinal indicators and qualitative justifications. Abstract force-directed node-link graphs are prohibited; visual relationships are shown through authored Warburgian constellations and the Temporal Coexistence Controller.

---

## 3. Constraints

1. **Cloudflare Worker Deployment Boundary:** Production continues to be served by the Cloudflare Worker `iconocracia` (`wrangler.jsonc`) via the `ASSETS` binding pointed at Astro's static build output (`dist/`), keeping edge caching, `/robots.txt`, `/sitemap.xml`, and clean 404 behavior intact.
2. **Zero-Downtime Phased Cutover:** The existing `site/` directory and production Worker remain untouched during Phases 1–3. The new Astro build is developed in a parallel workspace directory (or preview branch/Worker) and only replaces `site/` at Phase 9 after parity tests pass.
3. **Stable Identifiers:** Every existing artifact ID (`BR-009`, `US-008`, UUIDs) and constellation slug (`columbia-dois-chamados`) is preserved verbatim.
4. **Publication Gates Retained:** No image is hosted locally in public builds without `rights_evidence_url`, `credit`, `alt_text`, and SHA-256 verification.

---

## 4. Decisions Made by Ana

1. **Review State & Unified Authorship (Decision 1):**
   - Separate embedded interpretations out of `Object` records into `Claim` records.
   - Unreviewed legacy claims default to `epistemic_status: "hypothesis"` and `review_state: "draft"` (held back from public rendering until approved).
   - Strip legacy `coded_by` metadata completely; only `review_state` (`draft` | `reviewed` | `approved`) and `epistemic_status` (`documented` | `interpretation` | `hypothesis`) govern publication.
2. **Architecture Option B — Astro Content Collections (Decision 2):**
   - Adopt **Astro** with typed Content Collections, lifting the legacy no-build constraint in `AGENTS.md` while keeping all data in Git and outputting static HTML/CSS/JS to the Cloudflare Worker `ASSETS` binding.
3. **Protect the Palettes, Reopen the Visual Identity (Decision 3):**
   - Lock and preserve the color and typography token sets (`Iuris Memoria` / `Selo-Cartela · Lacre` and the `AGENTS.md` lavender `#B99AEE` / acid-yellow `#E4FF38` tokens, plus `Instrument Serif`, `Crimson Pro`, and `JetBrains Mono`), while reopening the visual identity and layout architecture to build the **Counter-Archive Dual-Axis Interface** and **Warburgian Temporal Coexistence Controller**.
4. **Progressive X-Ray Deconstruction Lens (Option B from Visual Companion):**
   - Artifact pages support a seamless toggle between the pure **Documented Catalogue (Left Axis / Stratum I)** and the **Counter-Archive Dual-Axis Confrontation (Left Facade ➔ Right Operation)** so both traditional legal historians and critical theorists are served without compromise.

---

## 5. Content Model & Schema Specification (`model/` & `src/content/config.ts`)

### 5.1 Entity Collections

1. **`objects` (`Object`):**
   - `id` (string, preserved verbatim)
   - `title` (string, institutional title) & `display_title` (optional string)
   - `object_type` / `support` (enum/vocab: `moeda`, `papel-moeda`, `medalha`, `selo`, `monumento`, `escultura`, `pintura`, `gravura`, `litografia`, `cartaz`, `fotografia`, `documento-juridico`)
   - `date_text` (string), `date_start` (number | null), `date_end` (number | null), `date_basis` (reference to `sources`)
   - `makers` (array of `{ agent_id, role }`)
   - `place` / `jurisdiction` (`country_code`, `country_pt`, `city`, `attribution_basis`)
   - `holding` (`institution_id`, `accession_number`, `catalogue_url`)
   - `observed_description` (string — strict Panofskian Level 1 pre-iconographic description)
   - `observed_motifs` (array of controlled strings: `espada`, `balanca`, `venda`, `barrete-frigio`, `fasces`, `livro-da-lei`, `coroa-de-louros`, `matriz-cunho`, etc.)
   - `standard_cataloging`:
     - `iconclass_codes`: array of `{ code: string, label: string, axis_role: "anatomical" | "personification" | "medium" | "sovereignty" | "other" }` (e.g., `31AA`, `44G0`, `48C24`, `44B`)
   - `images` (array of references to `images`)
   - `sources` (array of `{ source_id, locator, field_supported }`)
   - `strands` (array of references to `strands`, e.g., `["brasil-1822-1922"]`)
   - `editorial_status` (`"draft"` | `"review"` | `"published"` | `"withdrawn"`)

2. **`images` (`Image`):**
   - `id`, `object_id`
   - `file` (local WebP path), `sha256` (64-hex string)
   - `source_url`, `iiif_manifest` (optional URL)
   - `license`, `credit`, `rights_evidence_url`
   - `rights_status` (`"cleared_to_host"` | `"link_only"` | `"withheld"`)
   - `alt_text` (descriptive, non-interpretive), `caption`

3. **`sources` (`Source` — ABNT NBR 6023:2025):**
   - `id`, `source_type` (`archival_document` | `catalogue_record` | `book` | `chapter` | `article` | `periodical` | `legislation` | `jurisprudence` | `web_page`)
   - `authors` (array of strings or institutional author)
   - `title`, `subtitle`, `edition`, `place`, `publisher`, `date`
   - `periodical`, `volume`, `number`, `pages`, `e_locator`
   - `doi`, `url`, `accessed_on`, `isbn`, `issn`
   - `repository`, `fonds`, `call_number` (e.g., `BR RJANRIO 16`, `BR RJMRAHI MP-DI-001`)
   - `court`, `case_number`, `relator`, `judged_on`
   - `citation_abnt` (generated deterministically by build script following NBR 6023:2025; flags placeholder citations where legacy `citation_abnt == title`)
   - `verification` (`"checked_original"` | `"secondary_source"` | `"unverified"`)

4. **`claims` (`Claim` — Right Axis / The Operation):**
   - `id`, `statement` (text)
   - `epistemic_status` (`"documented"` | `"interpretation"` | `"hypothesis"`)
   - `review_state` (`"draft"` | `"reviewed"` | `"approved"`) — **only `"approved"` claims render on public pages**
   - `about` (non-empty array of `object_id`s)
   - `deconstructs_iconclass` (optional `{ iconclass_code: string, counter_code: string, critical_label: string }` — e.g., `31AA` ➔ `31AA::ANIMA.CSV` `[Contrato Sexual Visual]`)
   - `matrix_triad_dimension` (optional `"hystera_tutelage"` | `"numismatic_die_matriz"` | `"digital_grid_matrix"`)
   - `evidence` (array of `{ source_id, locator, note }` — required when `epistemic_status === "documented"`)
   - `concepts` (array of references to `concepts`)
   - `counter_evidence` (optional array), `open_questions` (optional string)
   - `supersedes` (optional `claim_id`)

5. **`concepts` (`Concept`):**
   - `id`, `term` (e.g., `contrato-sexual-visual`, `feminilidade-de-estado`, `purificacao-classica`, `contrato-racial-visual`, `marmore-a-margem`, `reconhecimento-sem-reciprocidade`)
   - `definition` (authored prose, never machine-generated)
   - `status` (`"core"` | `"working"` | `"retired"`)
   - `counter_notation_prefix` (e.g., `ANIMA.CSV`, `ANIMA.FE`, `ANIMA.PC`, `ANIMA.CRV`, `ANIMA.MM`)
   - `related_concepts`, `sources`, `strands`

6. **`constellations` (`Constellation`):**
   - `slug`, `title`, `subtitle`, `question`
   - `ghosted_formula` (e.g., `"A espada vem antes da reivindicação — e volta depois dela."`)
   - `members` (ordered list of `{ object_id, role_label, caption, alt_override }`)
   - `links` (array of `{ from_object_id, to_object_id, basis: "visual" | "historical" | "conceptual", rationale, evidence_sources }`)
   - `reading_claims` (array of references to `claims`)
   - `method_note` (explicit statement of limits and non-demonstrated causal links)
   - `editorial_status` (`"draft"` | `"review"` | `"published"`)

7. **`essays` (`Essay`), `experiments` (`Experiment`), `strands` (`Strand`):**
   - `strands/brasil-1822-1922.json`: Defines the doctoral thesis strand (`Brazil, 1822–1922`, with its 53 Brazilian core records + comparative European matrices and explicit inclusion criteria).

---

## 6. Visual Identity & Counter-Archive UI Blueprint

### 6.1 Dual-Voice Token Mapping (Protected Palettes)
- **Left Axis (The Facade — Standard Catalog & Iconclass):**
  - Surface: `--cream` (`#F8F5EE`) / `--paper` (`#EFE5CF`) with `--light-border` (`#D4C19A`) hairlines.
  - Typography: `--font-mono` (`JetBrains Mono`) for Iconclass codes (`31AA`, `44G0`, `48C24`, `44B`), call numbers, and physical dimensions; `--font-body` (`Crimson Pro`) for pre-iconographic description.
- **Center Bridge (The Plumb & Vector Spine):**
  - Uses `--plumb-line`, `--brand-amethyst` (`#8A5FA8`) / `#B99AEE` active nodes, and `--terracotta` (`#A04030`) / `#E4FF38` high-contrast action highlights when a user hovers or clicks an Iconclass row to trace its deconstruction.
- **Right Axis (The Operation — Critical Overlay):**
  - Surface: `--surface-cabinet` (`#1B2B4A` / `#131F36` dark indigo cabinet) with `--text-on-dark` (`#E8DCC4` warm ivory) and `--gold-bright` (`#D4A85E`) / `--brand-lacre` (`#A8281F`) accents.
  - Typography: `--font-display` (`Instrument Serif`) for critical headings (*Contrato Sexual Visual*, *Feminilidade de Estado*, *Mármore à Margem*) and `--font-body` (`Crimson Pro`) for authored `Claim` statements.
- **Progressive X-Ray Controller:**
  - Top bar on every `/acervo/[id]` page provides a one-click pill toggle between **Camada Documental (Catálogo)** and **Lente Contra-Arquivo (Dual-Axis)**, plus the **Warburgian Temporal Coexistence Slider** below the fold.

---

## 7. What Is Left to the Builder ( sensible defaults marked as builder calls )

1. **Folder Layout for Phased Migration (Builder Call):**
   - Keep `site/` intact until cutover. Place Phase 1 JSON Schemas in `model/schemas/`, the Phase 2 dry-run converter in `scripts/migrate_content_model.py` outputting to `.build/model-dry-run/`, and the Astro application in `astro-site/` (building to `astro-site/dist/`) so existing Playwright tests against `site/` continue passing until Phase 8–9 cutover.
2. **ABNT NBR 6023:2025 Formatter Module (Builder Call):**
   - Implement a deterministic formatter in `scripts/abnt_2025.py` (and TypeScript helper for Astro) that flags the 178 legacy records where `citation_abnt == title` as `verification: "unverified"` in the dry-run audit report rather than emitting fake citations.
3. **Legacy URL Redirects (Builder Call):**
   - Update `src/index.js` in the Worker so `/acervo.html?item=<ID>` and `/acervo?item=<ID>` 301-redirect to `/acervo/<ID>` once per-object static pages are enabled at cutover.
