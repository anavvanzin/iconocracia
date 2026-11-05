# Architectural, Editorial, and Navigational Plan
## Mnemosyne Viva (`iconocracia.com`)

**Status**: Publication-Grade Architectural Master Plan  
**Date**: 2026-11-05  
**Canonical Domain**: `https://iconocracia.com`  
**Display Title Proposal**: *Mnemosyne Viva* · **ICONOCRACIA · ATLAS DE PESQUISA** / **ICONOCRACIA · RESEARCH ATLAS**  
**Doctoral Strand Proposal**: *Mármore à Margem: Alegorias femininas no Brasil, 1822–1922* (*In marmore regnat, in iure tacet*)  
**Author & Principal Investigator**: Ana Vanzin (PPGD/UFSC)  
**External Academic Touchpoint**: `https://anavanzin.com`

---

## 1. Executive Summary & Epistemic Thesis

### 1.1. The Epistemic Mandate: Atlas vs. Thesis
The central architectural objective of this plan is to resolve a productive tension at the heart of `iconocracia.com`: the relationship between the **long-term umbrella research atlas** (*Mnemosyne Viva*) and the **inaugural doctoral dissertation strand** (*Mármore à Margem*).

Until now, the public presentation has at times conflated the two: the homepage introduced the site as "the public home of the doctoral thesis," while the underlying database contained hundreds of works from seventeen countries spanning eight centuries. This architectural plan formalizes a rigorous, non-reductionist distinction:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MNEMOSYNE VIVA (iconocracia.com)                                │
│                     Transnational Comparative Research Atlas                           │
│                     337+ Cataloged Items · 17 Countries · 1239–2021                    │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                         FOUR MODES OF ARTICULATION                              │   │
│   │                                                                                │   │
│   │   [1. Objects & Sources]        [2. Thematic Constellations]                   │   │
│   │       /acervo (Camada I)            /constelacoes (Camada II)                  │   │
│   │                                                                                │   │
│   │   [3. Concepts & Method]        [4. Interactive Experiments]                   │   │
│   │       /sobre (Epistemology)         /jogo (Foundry apparatus)                  │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                            │
│                 ┌─────────────────────────┴─────────────────────────┐                  │
│                 ▼                                                   ▼                  │
│   ┌───────────────────────────┐                       ┌────────────────────────────┐   │
│   │  INAUGURAL DOCTORAL STRAND│                       │   TRANSATLANTIC MATRICES   │   │
│   │    «MÁRMORE À MARGEM»     │◄─────────────────────►│     & COMPARATORS          │   │
│   │   Brazil, 1822–1922       │   Comparative Tension │  France, US, UK, Germany,  │   │
│   │   53 Cataloged Items      │   & Formal Transfer   │  Belgium, Spain, etc.      │   │
│   │   In marmore regnat...    │                       │  264 Cataloged Items       │   │
│   └─────────────┬─────────────┘                       └────────────────────────────┘   │
│                 │                                                                      │
│                 ▼ Historical & Forensic Dialogue                                       │
│   ┌────────────────────────────────────────────────────────┐                           │
│   │   BRAZILIAN ANTECEDENTS & AFTERLIVES (20 Items)        │                           │
│   │   • Colonial Matrices (1731–1820; 4 items)             │                           │
│   │   • Post-1922 Forensic Architecture (1930–2005; 16 it.)│                           │
│   │     (e.g., Belém 1940, Vargas Cruzeiro, Ceschiatti STF)│                           │
│   └────────────────────────────────────────────────────────┘                           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **The Research Atlas is Not Merely a Container for the Thesis**:
   The comparative atlas (*Mnemosyne Viva*) is an enduring open platform exploring how modern sovereign states personify their power through female allegorical bodies (Justice, the Republic, Liberty, the Nation, the Constitution). It operates across a transnational horizon of 337 items from 17 jurisdictions, extending from medieval civic precedents (1239) to contemporary legal-spatial conflicts (2021). Its theoretical lineage articulates Walter Benjamin's constellation method, Aby Warburg's *Bilderatlas Mnemosyne*, and Sigrid Weigel's visual epistemology.
2. **The Thesis is Not Lost in the Atlas**:
   The doctoral dissertation developed by Ana Vanzin at the Graduate Program in Law of the Federal University of Santa Catarina (PPGD/UFSC)—*Mármore à Margem: Alegorias femininas no Brasil, 1822–1922*—is the inaugural, deeply focused research strand anchored within this atlas. It interrogates a century of state formation: from political Independence (1822) to the Republican Centenary (1922).
3. **The Anti-Reductionist Invariant**:
   - The atlas must never be reduced to the thesis (which would discard or obscure the 264 transnational items from France, the United States, the United Kingdom, Germany, etc.).
   - The thesis must never be diluted by the atlas (which would dissolve the specific historical and legal paradox of Brazilian state formation: how living women were legally incapacitated while marble female allegories sanctified public institutions).

---

### 1.2. Exact Mathematical Corpus Bounds
An audit of the verified baseline datasets (`site/data/stats.json`, `site/data/acervo.json`, and `editorial/publication.json`) establishes the following factual parameters:

- **Total Publicly Published Catalog**: **337 items**
- **Items with Verified Local Reproductions (`.webp`)**: **332 items** (98.5%)
- **Jurisdictional Distribution**: **17 countries**
  - France: 103 items
  - Brazil: 73 items
  - United States: 32 items
  - Germany: 28 items
  - United Kingdom: 23 items
  - Italy: 20 items
  - Belgium: 11 items
  - Portugal: 11 items
  - Netherlands: 10 items
  - Spain: 10 items
  - Austria: 4 items
  - Chile: 3 items
  - Denmark: 3 items
  - Mexico: 3 items
  - Argentina: 1 item
  - Switzerland: 1 item
  - Uruguay: 1 item
- **Chronological Breadth**: **1239–2021** (effective coverage); core modernity concentration: **1800–2000**.
- **Distribution by Authorial Iconocratic Regime**:
  - *Regime Fundacional* (Foundational): 164 items
  - *Regime Normativo* (Normative): 103 items
  - *Regime Militar* (Military): 54 items
  - *Contra-alegoria* (Critical counter-allegory): 15 items
  - Unclassified / In review: 1 item

---

### 1.3. The Brazilian Corpus Breakdown: Strand vs. Dialogue Network
Total Brazilian items in the catalog: **73 items**. These divide deterministically into two distinct cohorts:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        BRAZILIAN CORPUS TOTAL (73 Items)                               │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│   INAUGURAL DOCTORAL STRAND: 1822–1922    │    BRAZILIAN DIALOGUE NETWORK: OUTSIDE     │
│              (53 Items)                   │               1822–1922 (20 Items)         │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • Strict chronological bound:             │ • Colonial Precedents (4 items):           │
│   Independence (1822) to Centenary (1922).│   SCOUT-560 (c. 1731–1750), SCOUT-569      │
│ • State-building laboratory:              │   (1774), SCOUT-570 (séc. XVI–XVIII),      │
│   - Imperial coins and legal frontispieces│   BR-022 (c. 1820).                        │
│   - Positivist Republican iconography     │ • Post-1922 Republican Afterlives (16 it.):│
│     (Décio Villares, 1891 Constitution)   │   - Belém 1940 (BR-002, BR-003: Monumento  │
│   - 1916 Civil Code tutela context.       │     à República, Praça da República).      │
│ • Filter & Data Hook:                     │   - Palácio da Justiça (SCOUT-572, 573).   │
│   - Runtime (Phase 1/2): `pais == "Brasil"`│   - Vargas Cruzeiro Currency (1942–1943).  │
│     and `(year >= 1822 and year <= 1922)` │   - Alfredo Ceschiatti, A Justiça, 1961    │
│     or `/xix\b/` regex for SCOUT-563      │     (BR-009, STF Brasília).                │
│     (`data: "século XIX"`, year: 1850).   │   - Military Regime Cruzeiros (1965–1975). │
│   - Canonical (Phase 3): explicit boolean │   - Palácio da Justiça RS (SCOUT-574, 2005)│
│     `item.recorte_tese == true`.          │                                            │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

Treating all 73 Brazilian items as "the thesis" is an error: it would falsely claim that Ceschiatti's 1961 modernist sculpture in front of the Supreme Federal Court in Brasília belongs to the 1822–1922 historical study. Conversely, filtering out the other 20 Brazilian items entirely would destroy the vital post-1922 forensic dialogue.

The architectural plan establishes three clearly labeled views:
1. **The Inaugural Doctoral Strand** (*Mármore à Margem*): exactly the 53 items from 1822 to 1922.
2. **The Atlantic Transfer Network**: European and American matrices that directly informed Brazilian artists and legislators.
3. **The Forensic Afterlives**: Brazilian works before 1822 and after 1922 demonstrating the survival (*Nachleben*) and hardening of these allegorical forms.

---

## 2. Information Architecture & Page Inventory

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        WHOLE-SITE INFORMATION ARCHITECTURE                             │
├───────────────────┬───────────────────┬───────────────────┬────────────────────────────┤
│  1. PORTAL &      │  2. OBJECTS &     │  3. CONSTELLATIONS│  4. CONCEPTS &             │
│     SYNTHESIS     │     SOURCES       │     & DOSSIERS    │     METHOD                 │
│  / (index.html)   │  /acervo          │  /constelacoes    │  /sobre                    │
│  • Public Gateway │  • 337 Items      │  • Thematic Paths │  • Epistemology & Method   │
│  • Constellation  │  • 3 Visual Modes │  • Dialectical    │  • 4 Concepts & Regimes    │
│    Field Canvas   │  • Camada I vs II   Montages          │  • Latin Seals             │
│  • Doctoral Call  │  • Strand Toggles │  • Gated Dossiers │  • Author Dossier          │
│  • 3 Dossiers     │  • Faceted Filters│                   │    (anavanzin.com)         │
├───────────────────┴───────────────────┴───────────────────┴────────────────────────────┤
│  5. INTERACTIVE EXPERIMENT: FOUNDRY (/jogo)                                            │
│  • Epistemic apparatus testing the 10 indicators of Classical Purification             │
│  • Matrix errans, lex immobilis · Primary archival disclosures                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  6. DEDICATED DOCTORAL STRAND SURFACE: MÁRMORE À MARGEM (/marmore-a-margem) [PHASE 3]   │
│  • Dedicated space for Brazil 1822–1922 (53 items) under In marmore regnat...           │
│  • The Legal Paradox: Petrification vs. Civil Incapacity (1916 Civil Code tutela)      │
│  • Atlantic comparators (Marianne, Columbia) and forensic afterlives (Ceschiatti/STF)  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  7. ERROR & RECOVERY SURFACE (/404 → 404.html)                                         │
│  • Branded, calm 404 handler with contextual return pathways                           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.1. Specifications for Existing Surfaces

#### 1. Portal & Synthesis (`/` → `site/index.html`)
- **Surface Role**: Public entrance, epistemic orientation, visual field demonstration, and gateway to all research modes.
- **Data Requirements**: Reads `site/data/stats.json` for live metrics; loads `site/assets/constellation-field.js` and `site/assets/constellations.js`.
- **Navigation Connections**: Top nav links to `/` (active), `/acervo`, `/constelacoes`, `/sobre`, `/jogo`, `/marmore-a-margem`. In-page anchor CTAs to `#recorte-tese`, `/acervo`, `/jogo`, `/marmore-a-margem`. Outbound link to `anavanzin.com`.
- **Key Sections**:
  1. *Masthead*: "MNEMOSYNE VIVA / ICONOCRACIA · ATLAS DE PESQUISA".
  2. *Hero Cartouche*: Display title "O Estado em corpo feminino", epigraph (*Cicero, De Oratore · Imago animi vultus*), thesis premise.
  3. *Constellation Field Canvas*: Interactive 16-card layout demonstrating spatial relationality.
  4. *Coexistence Dossiers*: Three historical case studies (US, France, Brazil).
  5. *Stat Band*: Dynamic metrics reading from `stats.json` (337 items, 17 countries, 1239–2021, and the dedicated 53-item doctoral slice).
  6. *Doctoral Strand Callout*: *O Atlas e o Recorte Doutoral* (*In marmore regnat, in iure tacet*).
  7. *Operations & Regimes*: *Patria feminea, civitas masculina* and the 4 iconocratic regimes.
  8. *Theoretical Concepts*: Visual Sexual Contract, State Femininity, Visual Racial Contract, Classical Purification.
  9. *Colophon & Footer*: Standard 3-column footer with Latin motto and CC-BY-4.0 terms.

#### 2. Research & Method (`/sobre` → `site/sobre.html`)
- **Surface Role**: Theoretical treatise, epistemological boundaries, methodology, and academic credentials.
- **Data Requirements**: Pure static document; loads `constellation-field.js` for theme/lang.
- **Navigation Connections**: Top nav links to `/`, `/acervo`, `/constelacoes`, `/sobre` (active), `/jogo`, `/marmore-a-margem`. Direct links to `anavanzin.com`.
- **Key Sections**:
  1. *Masthead & Inscriptio*: *Cicero, De Oratore · Imago animi vultus*.
  2. *Epistemic Separation Statement*: Strict boundary between documented archival source (Camada I) and situated authorial reading (Camada II).
  3. *The Doctoral Dissertation*: Formal presentation of *Mármore à Margem* (PPGD/UFSC).
  4. *Conceptual Vocabulary*: Detailed exposition of the 4 concepts.
  5. *The Constellation Method*: Benjamin, Warburg, Weigel lineage and the *Zwischenraum*.
  6. *The Transnational Comparative Horizon*: Analytical function of state jurisdiction.
  7. *Emblematic Seals*: The 4 Neo-Latin seals.
  8. *Author Dossier*: Scholarly profile and outbound touchpoint to `anavanzin.com`.

#### 3. Archival Collection & Sources (`/acervo` → `site/acervo.html`)
- **Surface Role**: Spatial exploration, faceted query, archival provenance examination, and full record inspection.
- **Data Requirements**: Fetches `site/data/acervo.json` (337 items), `site/data/stats.json`, and `site/data/publication-overlay.json`.
- **Navigation Connections**: Top nav links to `/`, `/acervo` (active), `/constelacoes`, `/sobre`, `/jogo`, `/marmore-a-margem`. Deep links to `/constelacoes?slug=...`, `/jogo`, and `/marmore-a-margem`.
- **Key Sections**:
  1. *Header Inscriptio Banner*: *Muta persona, loquens imago · Registro documental e leitura situada*.
  2. *Method Note*: Explains the dual-layer structure of every record.
  3. *Strand Selector Toolbar* (`.ex-strand-bar`): Button `#strand-all` ("Atlas comparativo completo · 337 itens") and `#strand-tese` ("Recorte da tese: Mármore à Margem · 53 itens").
  4. *Reciprocal Breadcrumb Cartouche* (`#ex-strand-context`): An editorial banner positioned directly above the faceted filter bar, styled with `.ex-constellation-label` (acid yellow `#E4FF38` highlight). When `activeStrand === 'tese'` (or `?recorte=tese` is active), it unhides and displays:
     ```html
     <div id="ex-strand-context" class="ex-constellation-label ex-strand-context" hidden>
       <a href="marmore-a-margem.html" class="ex-strand-return-link" data-en="← Return to the presentation of Marble at the Margin">
         ← Voltar à apresentação de Mármore à Margem
       </a>
       <span class="ex-strand-meta" data-en=" · Doctoral strand: Brazil (1822–1922) · 53 cataloged works">
         · Recorte da tese de doutorado: Brasil (1822–1922) · 53 obras catalogadas
       </span>
     </div>
     ```
     When `#strand-all` is active, `#ex-strand-context` is hidden. This eliminates the dead-end navigation trap, creating a persistent reciprocal return path for users arriving from `/marmore-a-margem`.
  5. *Faceted Filter Bar*: Search query input `#q`, dropdowns for Country (`#f-pais`), Regime (`#f-regime`), Period (`#f-periodo`), and Medium (`#f-tipo`).
  6. *Display Mode Switcher*: Constelação (`#view-constelacao`), Palco (`#view-palco`), Grade (`#view-grade`).
  7. *Canvas & Inspector*: Left interactive canvas, right caption inspector `#ex-caption` (title, author, date, description, Camada I/II metadata), and full modal ficha (`openRecord`).

#### 4. Thematic Constellations (`/constelacoes` → `site/constelacoes.html`)
- **Surface Role**: Curatorial approved pathways and relational comparative montages.
- **Data Requirements**: Fetches `site/data/constellations.json` and `site/data/acervo.json`.
- **Navigation Connections**: Top nav links to `/`, `/acervo`, `/constelacoes` (active), `/sobre`, `/jogo`, `/marmore-a-margem`. Individual card links open the corresponding work in `/acervo`.
- **Key Sections**:
  1. *Header Inscriptio Banner*: *Imago vigilans · Nunc fluens, nunc stans*.
  2. *Curatorial Introductory Statement* (`#constellation-intro`).
  3. *Ordered Card Sequence* (`#constellation-items`): Curated juxtaposition of approved works with relational captions.
  4. *Constellation Switcher* (`#constellation-switcher`): Allows switching between published dossiers.

#### 5. Interactive Experiment: Foundry (`/jogo` → `site/jogo.html`)
- **Surface Role**: Interactive epistemic apparatus exploring the formal mechanism of Classical Purification.
- **Data Requirements**: Loads `assets/jogo/jogo.js`, `assets/app.js`, `data/acervo.json`.
- **Navigation Connections**: Top nav links to `/`, `/acervo`, `/constelacoes`, `/sobre`, `/jogo` (active), `/marmore-a-margem`. Deep links on platen and end-dossier leading back to `/acervo`.
- **Key Sections**:
  1. *Header Inscriptio Banner*: *Matrix errans, lex immobilis · Aparato experimental*.
  2. *Game HUD*: Timer, target stamp, target axes, combo meter, minting actions.
  3. *Stage Canvas*: Coin platen with 6 graphic overlay stages.
  4. *Matrix Drawer*: 10 physical levers corresponding to the 10 purification indicators.
  5. *Epistemic Rule Modal*: Theoretical explanation of *Matrix errans, lex immobilis*.
  6. *Archival Concluding Dossier*: Primary catalog citation and custodial archive record unveiled upon completing a run.

#### 6. Clean Error Surface (`/404` → `site/404.html`)
- **Surface Role**: Edge fallback for unmapped routes, preserving brand atmosphere.
- **Data Requirements**: Zero data dependencies.
- **Key Sections**:
  1. *Brand Header*: Standard `.ex-header`.
  2. *Error Cartouche*: "Esta página não está no repertório".
  3. *Recovery CTAs*: "Explorar o acervo ↗" (`/acervo`), "Voltar ao início ↓" (`/`).

---

### 2.2. Dedicated Surface: *Mármore à Margem* (`/marmore-a-margem`)
To provide the doctoral research strand with its own intellectual home while remaining integrated into the atlas, this plan specifies a new dedicated surface: `/marmore-a-margem` (implemented as `site/marmore-a-margem.html` in Phase 3).

#### Architectural Specifications
- **URL Route**: `/marmore-a-margem` (clean route served by Worker).
- **Inscriptio**: ***In marmore regnat, in iure tacet*** («No mármore reina, no direito cala»).
- **Subtitle**: *Alegorias femininas e legitimidade jurídica no Brasil (1822–1922)*.
- **Affiliation**: Tese de Doutorado em Direito · PPGD / Universidade Federal de Santa Catarina (UFSC) · Pesquisadora: Ana Vanzin.
- **Data Hook & SCOUT-563 Handling**:
  - *Runtime Data Reality (Phase 1 & Phase 2)*: `site/data/acervo.json` serializes country as `"pais"` (not `norm_country`) and dates as string `"data"` (not numeric `year`). The 53 items are resolved using the existing client-side function `inThesisStrand(item)` in `site/assets/app.js`:
    ```javascript
    const yearOf = (item) => Number(String(item.data).match(/\b\d{4}\b/)?.[0]) || null;
    const inThesisStrand = (item) => {
      if (item.pais !== 'Brasil') return false;
      const year = yearOf(item);
      if (year !== null) return year >= 1822 && year <= 1922;
      return /xix\b/.test(normalize(item.data));
    };
    ```
    Where 52 items match `1822 <= year <= 1922`, and exactly 1 item (`SCOUT-563`, *Alegoria da Liberdade segurando a Bandeira do Brasil Império*, with `data: "século XIX"` and cataloged `year: 1850` in `corpus-data-enriched.json`) is captured deterministically by the fallback regex `/xix\b/`.
  - *Canonical Data Serialization Specification (Phase 3)*:
    In Phase 3, `scripts/build_data.py` (`build_items()`) will be updated to serialize an explicit boolean flag:
    ```python
    item["recorte_tese"] = bool(
        norm_country(x.get("country")) == "Brasil"
        and isinstance(item_year, int)
        and 1822 <= item_year <= 1922
    )
    if isinstance(item_year, int):
        item["ano"] = item_year
    ```
    The JSON schema (`schemas/acervo.schema.json`) will be updated to declare optional properties `"recorte_tese": {"type": "boolean"}` and `"ano": {"type": ["integer", "null"]}`, and the golden test fixtures in `tests/fixtures/acervo-production/` will be updated accordingly. This simplifies the client-side filter to `item.recorte_tese === true` while preserving backward compatibility.

#### Wireframe-Level Structural Breakdown & Copy Hierarchy

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SECTION 1: HEADER & SOVEREIGN INSCRIPTIO                                               │
│ • Display Inscriptio: IN MARMORE REGNAT, IN IURE TACET                                 │
│ • Sub-rubric: No mármore reina, no direito cala.                                       │
│ • H1: Mármore à Margem                                                                 │
│ • H2: Alegorias femininas e legitimidade jurídica no Brasil (1822–1922)                │
│ • Institutional Byline: Ana Vanzin · Tese de Doutorado · PPGD/UFSC                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SECTION 2: THE JURIDICAL PARADOX (PROBLEM STATEMENT)                                   │
│ • H2: O Paradoxo da Soberania Petrificada                                              │
│ • Lead Paragraph:                                                                      │
│   "Entre a Independência de 1822 e o Centenário de 1922, o Estado brasileiro cobriu    │
│    seus palácios, tribunais, moedas e frontispícios constitucionais com corpos         │
│    femininos soberanos: a República Positivista, a Justiça de toga alva, a Pátria,    │
│    a Liberdade. Contudo, sob as mesmas leis sancionadas sob essas efígies, as mulheres │
│    reais viviam sob incapacidade civil relativa (a tutela marital do Código Civil      │
│    de 1916) e exclusão política estrita (sem direito a voto até 1932)."                │
│ • Thematic Pillar A: A Petrificação Neoclássica (Contrato Racial e Branquitude)        │
│ • Thematic Pillar B: A Incapacidade Civil (Contrato Sexual e Tutela Marital)           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SECTION 3: THE 53 OBJECTS ACROSS THREE ICONOCRATIC REGIMES                             │
│ • H2: O Corpus da Tese: 53 Obras entre o Império e a República                         │
│ • Interactive Sub-Strand Filter:                                                       │
│   [Todos os 53 registros] [Regime Fundacional (24)] [Regime Normativo (19)] [Militar (10)]│
│ • Dynamic Card Grid: Rendering the 53 Brazilian works with quick-access modals.        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SECTION 4: TRANSATLANTIC MATRICES & COMPARATIVE TENSION                                │
│ • H2: As Matrizes Atlânticas: Tradução, Cópia e Desvio                                 │
│ • Comparative Callout 1: Marianne (França) vs. A República de Décio Villares (1900)   │
│ • Comparative Callout 2: Columbia (EUA) vs. Moedas da Primeira República               │
│ • Inscriptio: Discordia concors · Muta persona, loquens imago                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SECTION 5: FORENSIC AFTERLIVES: BEFORE & AFTER 1822–1922                                │
│ • H2: Sobrevivências e Arquitetura Forense (Pré-1822 e Pós-1922)                       │
│ • Historical Dialogue Cards:                                                           │
│   - Antecedente Colonial: SCOUT-560 (c. 1731–1750, Frontispício do Senado da Câmara)   │
│   - Monumento à República de Belém (1940, BR-002 / BR-003, Praça da República)        │
│   - A Reforma Monetária do Cruzeiro (1942–1943, Vargas / Estado Novo)                  │
│   - Alfredo Ceschiatti, A Justiça (1961, BR-009, Supremo Tribunal Federal, Brasília)   │
│     * Analytical note: The ultimate crystallization of Classical Purification.         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SECTION 6: APPARATUS & CITATION                                                        │
│ • Inscriptio: Veritas temporis filia · Ler é método, método é pesquisa                 │
│ • CTAs: [Examinar os 53 itens no Acervo ↗] [Experimentar na Fundição ↗]               │
│ • Citation Block (ABNT & Chicago): Formatted academic citation for the doctoral work.  │
│ • Standard Footer: Mnemosyne Viva · iconocracia.com · Ana Vanzin (anavanzin.com ↗)     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.3. Restructured Essays & Method Surface (`/sobre`)
To eliminate the current conflation of disparate topics on a single short page, `/sobre` will be reorganized into four clearly partitioned intellectual modules:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ MODULE 1: EPISTEMOLOGY & ARCHIVAL INTEGRITY                                            │
│ • H1: Pesquisa, Método e Epistemologia                                                 │
│ • Inscriptio: Veritas temporis filia · A verdade é filha do tempo                      │
│ • Core Treatise: Separation between Camada I (Archival Facts & Provenance) and         │
│   Camada II (Situated Authorial Interpretation). How custody records differ from       │
│   critical readings, and why pre-iconographic motifs belong to the archive.            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ MODULE 2: THE FOUR INTERSECTING CONCEPTS                                               │
│ • H2: O Vocabulário Conceitual da Iconocracia                                          │
│ • Concept 1: Contrato Sexual Visual (Imago imperat, femina excluditur)                 │
│ • Concept 2: Feminilidade de Estado (Dea in foro, mulier sub tutela)                   │
│ • Concept 3: Contrato Racial Visual (Whiteness and classical purification)             │
│ • Concept 4: Purificação Clássica (Matrix errans, lex immobilis)                       │
│ • Theoretical Synthesis: How the originality of Ana Vanzin's research emerges at the  │
│   exact intersection of these four axes.                                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ MODULE 3: THE CONSTELLATION METHOD & SPATIAL INTERACTION                               │
│ • H2: O Método da Constelação e o Zwischenraum                                         │
│ • Intellectual Genealogy: Walter Benjamin (the idea as constellation),                 │
│   Aby Warburg (Pathosformel & Mnemosyne), Sigrid Weigel (Body- and Image-Space).       │
│ • Interface Mechanics: Why the archive opens in Constellation mode rather than an      │
│   alphanumeric table; how relational proximity displaces teleological chronology.      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ MODULE 4: THE FOUR ICONOCRATIC REGIMES & APPARATUSES                                   │
│ • H2: Os Regimes Iconocráticos e os Aparatos Críticos                                  │
│ • The 3 Interpretive Regimes: Fundacional, Normativo, Militar                          │
│ • The Critical Test: Contra-alegoria (why it is a critical probe, not a 4th regime)   │
│ • Apparatus: Fundição (/jogo) as an epistemic laboratory, not a diversion              │
│ • Anti-Positivist Invariant: Permanent retirement of composite quantitative scores.    │
│ • The 4 Neo-Latin Emblematic Seals & Colophon                                          │
│ • Scholarly Byline & External Dossier Link to anavanzin.com ↗                          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.4. Relationship to External Touchpoints (`anavanzin.com`)
Per `SOUL.md` (Sections 3 & 6), `iconocracia.com` and `anavanzin.com` maintain distinct, complementary institutional functions:

- **`iconocracia.com`**: The collaborative research atlas and digital humanities platform. It houses the datasets, interactive tools, thematic constellations, Latin emblemata, and research methodology.
- **`anavanzin.com`**: Ana Vanzin's personal academic portfolio, institutional CV, and independent essay repository.
- **Boundary & Linking Protocol**:
  - `iconocracia.com` links out to `anavanzin.com` as an external institutional touchpoint: `<a href="https://anavanzin.com" target="_blank" rel="noopener"><strong>Ana Vanzin</strong> ↗</a> · PPGD/UFSC`.
  - `iconocracia.com` never attempts to become a personal blog, duplicate CV records, or subsume `anavanzin.com`.
  - Conversely, `anavanzin.com` links to `iconocracia.com` as one of Ana's major ongoing research projects.

---

## 3. Cross-Atlas Navigation Architecture & User Journeys

### 3.1. Symmetrical 4-Node Cross-Atlas Navigation Loop
The primary research surfaces must form a closed, bi-directional, and symmetrical navigation loop:

```
             ┌────────────────────────┐
             │       / (Início)       │
             └───────────┬────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────────┐ ┌─────────┐ ┌─────────────────┐
│ /acervo         │ │ /sobre  │ │ /constelacoes   │
│ Objects/Sources │ │ Method  │ │ Curated Paths   │
└────────┬────────┘ └────┬────┘ └────────┬────────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
             ┌────────────────────────┐
             │    /jogo (Fundição)    │
             │ Interactive Experiment │
             └────────────────────────┘
```

#### Navigational Bug Fixes & Harmonization
1. **Unhide `/constelacoes` in Static HTML**:
   - Currently, `<a href="constelacoes.html" data-constellations-link hidden>` is hardcoded with `hidden` in static HTML, causing layout shift (pop-in) or leaving the active page hidden if JS is slow or fails.
   - *Fix*: Remove `hidden` from static HTML. If `constellations.json` contains published pathways, link directly to `/constelacoes.html`.
2. **Integrate `/jogo` into Top Header Nav**:
   - Currently, `Fundição` (`/jogo.html`) is present in the footer of `index.html` and `sobre.html`, but completely absent from the top header `<nav>` of all pages.
   - *Fix*: Include `Fundição` in the top `<nav>` across all surfaces, ensuring visitors can access and understand the experimental apparatus from anywhere on the site.
3. **Standardize Header & Footer Navigation (Symmetrical 6-Surface Architecture)**:
   To ensure complete navigational symmetry and prevent discoverability dead-ends, all six primary surfaces are represented in identical order across both the top `<header class="ex-header"> <nav>` and the `<footer>`:
   - **Standard Header Nav (Across all 6 surfaces)**:
     `Início` · `Acervo` · `Constelações` · `Pesquisa e Método` · `Fundição` · `Mármore à Margem`
     *(In English: `Home` · `Archive` · `Constellations` · `Research & Method` · `Foundry` · `Marble at the Margin`)*
   - **Standard Footer Nav (Across all 6 surfaces)**:
     `Início` · `Acervo` · `Constelações` · `Pesquisa e método` · `Fundição` · `Mármore à Margem`
     *(In English: `Home` · `Archive` · `Constellations` · `Research & Method` · `Foundry` · `Marble at the Margin`)*
   - *Active State*: The active page carries `aria-current="page"` (styled with standard 2px underline in `.ex-header nav a[aria-current]`).
4. **Contextual Deep Linking**:
   - From `/jogo`: On each casting platen and in the final dossier, provide a direct link: `"Consultar registro documental no acervo ↗"` opening that work's modal in `/acervo`.
   - From `/acervo`: For each work belonging to an approved constellation or formal purification profile, provide links to `/constelacoes?slug=...` or `/jogo`.
5. **Bidirectional Doctoral Strand Navigation**:
   - Outbound from `/marmore-a-margem`: Primary CTAs in Section 3 and Section 6 link to `/acervo?recorte=tese`.
   - Inbound on `/acervo`: The URL parameter `?recorte=tese` activates `activeStrand = 'tese'`, filters the collection to the 53 works, and immediately displays the reciprocal breadcrumb cartouche (`#ex-strand-context`): *«← Voltar à apresentação de Mármore à Margem»*. Clicking this breadcrumb returns the reader directly to `/marmore-a-margem`, preserving browsing state.

---

### 3.2. Detailed User Journeys

#### Journey 1: The International Academic Audience
*Profile: Comparatists, legal historians, Aby Warburg / Walter Benjamin visual theorists, Anglo-American feminist jurisprudence scholars arriving via English publications or conference links.*

```
[Step 1: Ingress via English Search / Link]
  ↓ Lands on /en/ or /en/sobre.
  ↓ Document is native <html lang="en">; subtitle reads "ICONOCRACIA · RESEARCH ATLAS".
[Step 2: Methodological Orientation on /en/sobre]
  ↓ Reads epistemic distinction: Camada I (archival facts) vs Camada II (situated reading).
  ↓ Notes the 4 theoretical concepts: Visual Sexual Contract, State Femininity,
    Visual Racial Contract, Classical Purification.
  ↓ Understands that the atlas is a transnational 337-item comparative collection.
[Step 3: Comparative Archival Inquiry on /en/acervo]
  ↓ Filters by country: United States, France, Germany, or United Kingdom.
  ↓ Inspects Oscar Roty's Semeuse (FR-SEM-1898) or Hedwig Reicher as Columbia (US-008).
  ↓ Verifies primary holding institution (Library of Congress / BnF) and rights status.
[Step 4: Constellation Exploration on /en/constelacoes]
  ↓ Explores the curated dossier "Columbia (1899 · 1913 · 1917)".
  ↓ Observes the Benjaminian montage contrasting suffrage protest with wartime mobilization.
[Step 5: Theoretical & Citation Exit]
  ↓ Copies peer-reviewed academic citation (ABNT / Chicago).
  ↓ Clicks footer author link to anavanzin.com ↗ to view related publications.
```

#### Journey 2: The Brazilian Academic Audience
*Profile: PPGD/UFSC faculty and researchers, Brazilian constitutional law scholars, legal historians, feminist jurisprudence researchers, CAPES evaluators.*

```
[Step 1: Ingress via University Link / Lattes / Thesis Reference]
  ↓ Lands on iconocracia.com in Portuguese.
[Step 2: Ingress via Header Navigation or Homepage]
  ↓ Discovers "Mármore à Margem" directly in the top header <nav> (or clicks Section 4 on homepage).
  ↓ Lands on /marmore-a-margem.
[Step 3: Historical-Juridical Immersion & Bidirectional Archival Exploration]
  ↓ Reads the juridical paradox (Petrification vs. Civil Incapacity under 1916 Civil Code).
  ↓ Clicks CTA "[Examinar os 53 itens no Acervo ↗]" entering /acervo?recorte=tese.
  ↓ Explores the 53 works in Constelação, Palco, or Grade mode.
  ↓ Uses the prominent reciprocal breadcrumb "← Voltar à apresentação de Mármore à Margem" to return seamlessly to the doctoral essay.
  ↓ Studies the transition from imperial coins to Décio Villares's positivist Republic (1900).
[Step 4: Forensic Afterlives & Classical Purification]
  ↓ Traces the afterlives into Brasília (Alfredo Ceschiatti's A Justiça, 1961, STF).
  ↓ Tests the formal levers of Classical Purification in Fundição (/jogo).
[Step 5: Academic Reference & PPGD/UFSC Citation]
  ↓ References the theoretical framework in master's or doctoral work at UFSC.
  ↓ Navigates to /sobre to cite the four iconocratic regimes and the Latin formulas.
```

---

## 4. Epistemic Content Model & Publication Gating

### 4.1. Field-by-Field Epistemic Classification Matrix

Every field in the repository is formally classified into either **Camada I** (Documented Archival Facts & Provenance) or **Camada II** (Situated Authorial Interpretation & Theory):

| Field Name | Storage Location | Epistemic Layer | Definition & Epistemic Authority | UI Presentation Rule |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `acervo.json` | **Camada I** | Stable archival identifier (country prefix or UUID). | Rendered in monospace; used for permalinks. |
| `titulo` | `acervo.json` (`title`) | **Camada I** | Historical/institutional title cataloged by the holding archive. | Displayed as primary object title in Roman serif. |
| `autoria` | `acervo.json` (`creator`) | **Camada I** | Documented creator/artist/sculptor or institutional author. | Displayed with date/institution under Camada I. |
| `pais` | `acervo.json` (`country`) | **Camada I** | State/jurisdictional origin of the object. | Primary documentary filter and metadata item. |
| `data` / `ano` | `acervo.json` (`date`, `year`)| **Camada I** | Cataloged date or historical interval of production. | Displayed in metadata list; used for chronological span. |
| `suporte` | `acervo.json` (`medium`) | **Camada I** | Physical medium (marble, bronze, oil, coin, engraving). | Displayed in metadata list; filterable dropdown. |
| `instituicao` | `acervo.json` (`institution`)| **Camada I** | Holding institution, custodial archive, or museum. | Explicit custodial provenance line. |
| `fonte_url` | `acervo.json` / overlay | **Camada I** | Canonical link to catalog entry at the holding archive. | External link button: "Arquivo de origem ↗". |
| `imagem_fonte` | `acervo.json` / overlay | **Camada I** | Verified link to original repository digital reproduction. | Fallback image link with rights verification. |
| `imagem` | `acervo.json` / overlay | **Camada I** | Web-optimized local asset path (`assets/acervo/<id>.webp`). | Primary image canvas rendering. |
| `tem_imagem` | `acervo.json` | **Camada I** | Boolean flag indicating reproduction availability. | Determines card rendering mode. |
| `direitos` / `licenca`| `acervo.json` (`rights`) | **Camada I** | Legal rights statement (Public Domain, CC-BY, etc.). | Legal colophon line in modal. |
| `credito` | `acervo.json` / overlay | **Camada I** | Institutional reproduction credit line. | Displayed immediately below image reproduction. |
| `citacao` | `acervo.json` (`citation_abnt`)| **Camada I** | Formal academic bibliographic citation of the source. | Selectable text block for scholarly reuse. |
| `motivos` | `acervo.json` (`motif`) | **Camada I** | Pre-iconographic descriptive elements cataloged by archives. | **Relocated from Camada II to Camada I.** |
| `texto_alternativo` | `publication-overlay.json` | **Camada I** | Neutral descriptive visual accessibility text. | Rendered in `img alt` attribute. |
| `descricao` | `acervo.json` (`description`)| **Camada I** | Objective archival description transcribed from custody records.| Transcribed archival summary under Camada I. |
| `regime_iconocratico`| `acervo.json` (`regime`) | **Camada II** | Situated authorial typology (*Fundacional*, *Normativo*, etc.). | Styled badge/pill with tooltip under Camada II. |
| `recorte_atlas` | `app.js` logic | **Camada II** | Assignment to *Mármore à Margem* or Comparative Atlas. | Strand badge under Camada II. |
| `analise_publica` | `publication-overlay.json` | **Camada II** | Authorial argument: `summary`, Panofsky 3 levels, method note.| Expandable accordion in modal; requires author approval. |
| `contract_visual_sexual`| `acervo.json` | **Camada II** | Situated reading of the Visual Sexual Contract enacted. | Conceptual indicator under Camada II. |
| `coloniality_of_seeing`| `acervo.json` | **Camada II** | Situated reading of neoclassical racial coding. | Conceptual indicator under Camada II. |
| `purification_indicators`| `iconographic_metadata` | **Camada II** | 10 discrete ordinal indicators of Classical Purification. | Mapped to Foundry levers in `/jogo`. |
| `constelacoes` | `acervo.json` / overlay | **Camada II** | Curatorial constellation memberships and relational cards. | Clickable constellation links leading to dossiers. |

---

### 4.2. UI Restructuring Specifications for `site/assets/app.js`

To resolve the current flattening where Camada I and Camada II fields are mixed inside a single `<dl>` in `site/assets/app.js`, Phase 3 will implement the following structural refactoring:

#### 1. Refactoring the Modal Ficha (`openRecord`)
Replace the single `<dl class="ex-record">` with two semantic, accessible `<section>` elements:

```html
<!-- ========================================================
     CAMADA I: DOCUMENTARY RECORD & PROVENANCE
     ======================================================== -->
<section class="record-layer record-layer--documentary" aria-labelledby="layer-doc-title">
  <div class="layer-header">
    <span class="layer-badge">Camada I</span>
    <h3 id="layer-doc-title">Registro documental e proveniência</h3>
    <p class="layer-sub">Dados catalográficos, arquivo de guarda e citação</p>
  </div>
  <dl class="layer-dl">
    <dt>Registro</dt><dd>BR-005</dd>
    <dt>Autoria</dt><dd>Décio Villares</dd>
    <dt>País</dt><dd>Brasil</dd>
    <dt>Data</dt><dd>c. 1900</dd>
    <dt>Instituição</dt><dd>Museu da República, Rio de Janeiro</dd>
    <dt>Suporte</dt><dd>Óleo sobre tela</dd>
    <dt>Motivos catalogados</dt><dd>República, barrete frígio, ramo de louro</dd>
    <dt>Descrição arquivística</dt><dd>Alegoria da República em trajes clássicos...</dd>
    <dt>Direitos</dt><dd>Domínio público</dd>
    <dt>Crédito da reprodução</dt><dd>Museu da República / Ibram</dd>
    <dt>Citação bibliográfica</dt><dd>VILLARES, Décio. Alegoria da República. Rio de Janeiro...</dd>
  </dl>
  <div class="layer-actions">
    <a class="ex-action" href="..." target="_blank" rel="noopener">Arquivo de origem ↗</a>
  </div>
</section>

<!-- ========================================================
     CAMADA II: RESEARCH READING & THEORETICAL FRAMING
     ======================================================== -->
<section class="record-layer record-layer--interpretive" aria-labelledby="layer-read-title">
  <div class="layer-header">
    <span class="layer-badge">Camada II</span>
    <h3 id="layer-read-title">Leitura na pesquisa</h3>
    <p class="layer-sub">Enquadramento teórico e análise iconológica situada</p>
  </div>
  <dl class="layer-dl">
    <dt>Recorte no atlas</dt><dd>Mármore à Margem · Brasil (1822–1922)</dd>
    <dt>Regime iconocrático</dt><dd><span class="pill regime-fundacional">Fundacional</span></dd>
    <dt>Constelações associadas</dt>
    <dd><a href="constelacoes.html?slug=republicas-atlanticas" class="constellation-tag">Repúblicas Atlânticas ↗</a></dd>
  </dl>

  <!-- Conditional Analytical Disclosure -->
  <div class="layer-analysis">
    <!-- Case A: analise_publica exists and is approved -->
    <details class="ex-analysis" open>
      <summary>Análise iconográfica (Método Panofsky)</summary>
      <div class="analysis-content">
        <p><strong>Nível 1 (Pré-iconográfico):</strong> Figura feminina jovem...</p>
        <p><strong>Nível 2 (Iconográfico):</strong> A personificação da República brasileira...</p>
        <p><strong>Nível 3 (Iconológico):</strong> O contrato sexual visual positivista...</p>
        <p class="analysis-limitation"><em>Nota de método:</em> Análise restrita à circulação oficial...</p>
      </div>
    </details>

    <!-- Case B: analise_publica pending / absent -->
    <div class="layer-pending-notice" role="note">
      <p><em>Registro documental e classificação preliminar em catálogo; análise iconológica em revisão autoral.</em></p>
    </div>
  </div>
</section>
```

#### 2. Refactoring the Sidebar Inspector (`#ex-metadata`)
In `site/acervo.html`, split `#ex-metadata` into two distinct semantic sub-containers:
- `#ex-metadata-doc`: Displays `País`, `Data`, `Suporte`, `Instituição`.
- `#ex-metadata-analysis`: Displays `Recorte no atlas`, `Regime iconocrático`, and `Constelações`.

---

### 4.3. Compliance with Publication Gating (`scripts/publication_sync.py`)
All content model updates must strictly respect the invariant rules enforced by `scripts/publication_sync.py`:

1. **Explicit Authorial Approval Required**:
   An item can only be published if `approved_by` in `editorial/publication.json` matches "Ana Vanzin" (or "ana") with a valid ISO date.
2. **Verified Rights & Image SHA-256 Pinning**:
   Every published reproduction must have an approved rights status, an active evidence URL, and an exact SHA-256 hash match against the file in `site/assets/acervo/`.
3. **Indivisibility of Constellations**:
   A curatorial constellation path is atomic: if a single work within it is in `review` or `withheld`, the entire constellation is excluded from `site/data/constellations.json`.
4. **Permanent Retirement of Quantitative Scores**:
   Fields matching `RETIRED_FIELDS` (`endurecimento_score`, `hardening_score`, `purification_score`, `composite_score`) are automatically stripped. The project categorically rejects reductionist numerical indexing.
5. **Directory Separation**:
   `editorial/publication.json` and its state receipts must remain strictly outside `site/`.

---

## 5. Bilingual Strategy & Routing Architecture

### 5.1. Comparative Evaluation: Option A vs. Option B

| Evaluation Dimension | Option A: In-DOM Attribute Toggling (`data-en`) | Option B: Dedicated Static Routes (`/en/` pages) | Detailed Evaluation & Architectural Impact |
| :--- | :--- | :--- | :--- |
| **1. Maintenance & Authoring Ergonomics** | **High Friction**<br>Authors must encode complex paragraphs into HTML attributes using escaped quotes (`data-en-html="..."`). Escaping errors break markup. Comments and clean markdown are impossible. Bloats single HTML file size for all users. | **Low Friction & Clean**<br>Authors write standard, clean HTML in `/en/*.html`. Natural paragraph formatting, clean git diffs, semantic headings, and full markdown-to-HTML ergonomics without attribute string escaping. | **Option B is overwhelmingly superior.** As text volume grows, Option A becomes unmaintainable and highly prone to syntax corruption. |
| **2. Search Engine Optimization (SEO) & `hreflang`** | **Incompatible with Standard Indexing**<br>Search crawlers (Google, Bing, Google Scholar) receive only the initial `<html lang="pt-BR">` payload. English text in attributes is ignored or degraded. Cannot generate bidirectional `<link rel="alternate" hreflang="en">` tags. | **100% Standards Compliant**<br>Each language version possesses a canonical, indexable URL (`/sobre` vs `/en/sobre`). Full bidirectional `hreflang` support in both HTML `<head>` and dynamic XML sitemap. Maximizes international scholarly discovery. | **Option B is mandatory** for genuine international academic discovery and Google Scholar indexing of English essays. |
| **3. Cloudflare Edge & Core Web Vitals** | **Edge-Neutral, Client-Heavy**<br>The Worker serves one file, but client-side JavaScript must traverse hundreds of DOM nodes to swap text upon load, risking Cumulative Layout Shift (CLS) and Flash of Untranslated Content (FLOC). | **Zero Client-Side Latency**<br>The Worker serves native English HTML directly from edge cache (`Cache-Control: public, max-age=300`). Initial load renders instantly with zero client-side DOM mutation, guaranteeing optimal Core Web Vitals. | **Option B eliminates rendering jank** and provides a deterministic, instant first contentful paint (FCP). |
| **4. Web Accessibility & NoScript Reliability** | **Fragile Accessibility**<br>Screen readers initially announce the page using Portuguese pronunciation dictionaries. Dynamic DOM replacement fails to notify assistive technologies reliably. In no-JavaScript environments, English is 100% inaccessible. | **Universal Accessibility**<br>Native `<html lang="en">` is declared from byte zero. Screen readers immediately apply correct English pronunciation rules. The entire English site remains 100% readable with JavaScript disabled. | **Option B complies fully with WCAG 2.1 AAA standards** for multilingual international accessibility. |
| **5. Translation Workflow & Publication Gating** | **Coupled & Fragile**<br>Translating one section requires editing the production Portuguese page. Unfinished English translations either leak or must remain blank in attributes. | **Decoupled & Phased**<br>English pages can be translated and published incrementally. English surfaces can display elegant translation notes while the Portuguese site remains fully functional. | **Option B allows incremental translation** without touching stable Portuguese pages. |

---

### 5.2. Architectural Recommendation
**Adopt Option B: Dedicated Static Routes (`/en/` pages).**

#### Production Routing Architecture
- **Portuguese Edition (Canonical Default)**:
  - `/` or `/index` → `site/index.html`
  - `/acervo` → `site/acervo.html`
  - `/constelacoes` → `site/constelacoes.html`
  - `/sobre` → `site/sobre.html`
  - `/jogo` → `site/jogo.html`
  - `/marmore-a-margem` → `site/marmore-a-margem.html`
- **English Edition (Dedicated Static Routes)**:
  - `/en` or `/en/index` → `site/en/index.html`
  - `/en/acervo` → `site/en/acervo.html`
  - `/en/constelacoes` → `site/en/constelacoes.html`
  - `/en/sobre` → `site/en/sobre.html`
  - `/en/jogo` → `site/en/jogo.html`
  - `/en/marmore-a-margem` → `site/en/marmore-a-margem.html`

#### Bilingual Asset Resolution & Defense-in-Depth Architecture
To eliminate relative asset trapping when serving dedicated English static pages under `/en/`, the platform enforces a strict dual-layer resolution standard:

1. **Document Layer (Root-Relative Paths in Markup and Scripts)**:
   - All English templates (`site/en/*.html`) MUST use root-relative paths for all external assets:
     - Stylesheets: `<link rel="stylesheet" href="/assets/style.css?v=...">`
     - Fonts: `<link rel="stylesheet" href="/assets/design-system/fonts/fonts.css">`
     - Preloads: `<link rel="preload" href="/assets/design-system/fonts/..." as="font" type="font/woff2" crossorigin>`
     - Icons: `<link rel="icon" href="/assets/edelweiss-icon.png" type="image/png">`
     - Scripts: `<script src="/assets/app.js?v=..." defer></script>`
     - Static Images: `<img src="/assets/acervo/<id>.webp" ...>`
   - All internal navigation links in `/en/*.html` MUST use explicit root-relative paths:
     - Home: `<a href="/en">`
     - Archive: `<a href="/en/acervo">`
     - Constellations: `<a href="/en/constelacoes">`
     - Research & Method: `<a href="/en/sobre">`
     - Foundry: `<a href="/en/jogo">`
     - Doctoral Strand: `<a href="/en/marmore-a-margem">`
   - In-page anchors remain standard hash references (`<a href="#section">`), preserving native scroll jumps without base URI hijacking.
   - *Architectural Note on `<base href="/">`:* Raw `<base href="/">` is intentionally **prohibited** as a primary fix because standard browser implementations hijack in-page hash links (`<a href="#intro">` jumps to `/#intro` on the Portuguese home page) and cause relative page links to exit the English edition.
   - In Phase 2, shared JavaScript files (`site/assets/app.js`, `constellations.js`, `levels.js`) will be updated to issue root-relative fetches:
     - `fetch('/data/acervo.json')`
     - `fetch('/data/stats.json')`
     - `fetch('/data/constellations.json')`
     - `fetch('/data/publication-overlay.json')`
     - `fetch('/data/jogo.json')`
     - Image constructors: `'/assets/acervo/' + encodeURIComponent(item.id) + '.webp'`

2. **Worker Layer (Defense-in-Depth Asset Rewriting)**:
   In `src/index.js`, the Worker intercepts any requests matching `/en/assets/*` or `/en/data/*` and strips the `/en` prefix before delegating to `env.ASSETS`:
   ```javascript
   // Defense-in-depth: rewrite trapped relative asset and data calls from /en/
   if (url.pathname.startsWith('/en/assets/') || url.pathname.startsWith('/en/data/')) {
     const strippedPath = url.pathname.slice(3); // strips '/en'
     const assetRequest = new Request(new URL(strippedPath, url.origin), request);
     return env.ASSETS.fetch(assetRequest);
   }
   ```
   This guarantees that even if a relative URL is inadvertently used in dynamic HTML, markdown, or third-party embeds, the asset resolves with HTTP 200 and correct caching headers.

#### Cloudflare Worker Integration (`src/index.js`)
Refactor route resolution in `src/index.js` from ad-hoc ternary string interpolation (`${path}.html`) to a declarative `ROUTE_MAP` table:

```javascript
/**
 * Canonical route-to-asset mapping table.
 * Maps clean edge URLs (without trailing slashes or .html) to physical files in site/.
 */
const ROUTE_MAP = new Map([
  // Portuguese Edition Canonical Routes
  ['/', '/index.html'],
  ['/index', '/index.html'],
  ['/acervo', '/acervo.html'],
  ['/sobre', '/sobre.html'],
  ['/constelacoes', '/constelacoes.html'],
  ['/jogo', '/jogo.html'],
  ['/marmore-a-margem', '/marmore-a-margem.html'],

  // English Edition Static Routes (Option B)
  ['/en', '/en/index.html'],
  ['/en/index', '/en/index.html'],
  ['/en/acervo', '/en/acervo.html'],
  ['/en/sobre', '/en/sobre.html'],
  ['/en/constelacoes', '/en/constelacoes.html'],
  ['/en/jogo', '/en/jogo.html'],
  ['/en/marmore-a-margem', '/en/marmore-a-margem.html'],
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);

    if (url.pathname === '/robots.txt') {
      return new Response(buildRobots(), { headers: TEXT_HEADERS });
    }

    if (url.pathname === '/sitemap.xml') {
      const stats = await fetchSiteStats(env);
      return new Response(buildSitemap(stats), { headers: XML_HEADERS });
    }

    if (REDIRECTS.has(path)) {
      return Response.redirect(`${BASE_URL}${REDIRECTS.get(path)}`, 301);
    }

    // Trailing slash canonicalization across all mapped routes (HTTP 308 permanent redirect)
    if (url.pathname !== '/' && url.pathname.endsWith('/') && ROUTE_MAP.has(path)) {
      url.pathname = path;
      return Response.redirect(url.href, 308);
    }

    // Defense-in-depth: transparent rewrite for trapped assets under /en/
    if (url.pathname.startsWith('/en/assets/') || url.pathname.startsWith('/en/data/')) {
      const strippedPath = url.pathname.slice(3);
      return env.ASSETS.fetch(new Request(new URL(strippedPath, url.origin), request));
    }

    // Clean route serving from edge cache
    if (ROUTE_MAP.has(path)) {
      return servePage(env, ROUTE_MAP.get(path));
    }

    // Static assets fall through to ASSETS binding
    const isAsset = /\.[a-z0-9]+$/i.test(url.pathname);
    if (isAsset) {
      const res = await env.ASSETS.fetch(request);
      const immutable = /\.(webp|woff2)$/i.test(url.pathname);
      if (!immutable) return res;
      const headers = new Headers(res.headers);
      headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
      return new Response(res.body, { status: res.status, headers });
    }

    // Context-aware 404 fallback
    const notFoundAsset = path.startsWith('/en') ? '/en/404.html' : '/404.html';
    return servePage(env, notFoundAsset, 404);
  },
};
```

- **Dynamic Sitemap XML**: `buildSitemap(stats)` emits bidirectional alternate `xhtml:link` entries for all paired Portuguese and English routes:
  - `<xhtml:link rel="alternate" hreflang="pt-BR" href="https://iconocracia.com/sobre" />`
  - `<xhtml:link rel="alternate" hreflang="en" href="https://iconocracia.com/en/sobre" />`

#### The Route-Aware Header Switcher (`#lang-toggle`)
The existing `#lang-toggle` button in the header transforms from a client DOM mutator into an instant, route-aware switcher:
- When a user on `/sobre` clicks `EN`, they are navigated to `/en/sobre`.
- When a user on `/en/acervo?f-pais=França` clicks `PT`, they are navigated to `/acervo?f-pais=França`.

---

### 5.3. Policy for Latin *Inscriptiones* and Terminology
Latin emblemata fulfill a formal, philological role in the project and must never be translated into English or Portuguese in place of the Latin original:

1. **Latin Inscriptiones Remain in Latin on Both Editions**:
   - On Portuguese pages: Latin motto (*inscriptio*) is displayed prominently in `Instrument Serif` italics, followed by the Portuguese translation:
     *«In marmore regnat, in iure tacet · No mármore reina, no direito cala»*.
   - On English pages: Latin motto (*inscriptio*) is displayed identically in `Instrument Serif` italics, followed by the English translation:
     *“In marmore regnat, in iure tacet · In marble she reigns, in law she is silent”*.
2. **Standardized English Terminology for Core Concepts**:
   - *Contrato Sexual Visual* → **Visual Sexual Contract**
   - *Feminilidade de Estado* → **State Femininity**
   - *Contrato Racial Visual* → **Visual Racial Contract**
   - *Purificação Clássica* → **Classical Purification**
   - *Regime Fundacional* → **Foundational Regime**
   - *Regime Normativo* → **Normative Regime**
   - *Regime Militar* → **Military Regime**
   - *Contra-alegoria* → **Counter-allegory**
   - *Fundição* → **Foundry** (with subtitle *Matrix errans, lex immobilis*)

---

## 6. Nominal Architecture & Emblemata System

### 6.1. Status of Names and Authorial Sovereignty
Per `soul.md` (Sections 3 & 6) and `docs/naming-and-emblemata.md`:
- **All titles, site names, and Latin mottoes are authorial proposals under active evaluation by Ana Vanzin**.
- *Mnemosyne Viva* is the proposed display title for the comparative research atlas.
- The immutable, permanent technical anchor is the canonical domain: **`iconocracia.com`**.
- The architectural design remains modular and decoupled, ensuring that if Ana refines the display title, no codebase rewrites or domain migrations are required.

---

### 6.2. The Four Architectural Scales

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SCALE I: PROGRAM & DOMAIN (Identidade Institucional Guarda-Chuva)                      │
│ • Name: ICONOCRACIA · Imagens, direito e memória política                              │
│ • Canonical Domain: iconocracia.com                                                    │
│ • Function: Permanent institutional umbrella and canonical address.                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SCALE II: THE COMPARATIVE RESEARCH ATLAS (O Atlas Aberto)                              │
│ • Name Proposal: Mnemosyne Viva (ou Atlas Mnemosyne Viva)                              │
│ • Role: Transnational platform of 337+ items (17 countries, 1239–2021).                │
│ • Conceptual Core: Counter-operation to Classical Purification: keeping the archival   │
│   body relational, mobile, and alive.                                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SCALE III: THE INAUGURAL DOCTORAL STRAND (O Recorte Doutoral / Tese)                   │
│ • Name Proposal: Mármore à Margem · In marmore regnat, in iure tacet                   │
│ • Subtitle: Alegorias femininas e legitimidade jurídica no Brasil (1822–1922)          │
│ • Role: Specific historical-juridical investigation of the 53 Brazilian works.         │
│ • Alliteration: Mármore (petrification/whiteness) vs. À Margem (civil exclusion).     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SCALE IV: APPARATUSES, SEALS & INSCRIPTIONES (Divisas Emblemáticas)                    │
│ • Rigorous Neo-Latin formulas functioning as Renaissance emblemata (Alciato, Ripa).    │
│ • Assigned to specific sections, regimes, apparatuses, and colophons.                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.3. Classical Philology & Inventory of Latin Formulas

| Formula (*Inscriptio*) | Classical Source & Philological Grounding | Portuguese Translation | English Translation | Architectural Placement |
| :--- | :--- | :--- | :--- | :--- |
| ***In marmore regnat, in iure tacet.*** | Classical Latin syntax; balanced antithesis between ablatives of place (*in marmore* / *in iure*) and active verbs (*regnat* / *tacet*). | *No mármore reina, no direito cala.* | *In marble she reigns, in law she is silent.* | Primary motto of **Mármore à Margem** (Scale III); site colophon. |
| ***Matrix errans, lex immobilis.*** | Pure classical Latin; pairs the Hippocratic biological concept (*matrix errans*, roaming womb) with the metallurgical/juridical coining die (*matrix*) fixed by law (*lex immobilis*). **Corrects and supersedes the macaronic Greek-Latin hybrid *Lex Hystera*.** | *Matriz errante, lei imóvel.* | *Wandering matrix, immutable law.* | Subtitle and seal of **Fundição (`/jogo`)** and Classical Purification. |
| ***Veritas temporis filia.*** | Authentic classical proverb cited by Aulus Gellius (*Noctes Atticae* 12.11.7); Erasmus *Adagia*. **Corrects and replaces the ungrammatical `Veritas Tempora` in `site/sobre.html`.** | *A verdade é filha do tempo.* | *Truth is the daughter of time.* | Primary sources seal on `/sobre`; archival provenance colophon. |
| ***Dea in foro, mulier sub tutela.*** | Antithesis between civic deification (*dea in foro*) and civil incapacity (*mulier sub tutela* in Roman law and the 1916 Civil Code). | *Deusa no foro, mulher sob tutela.* | *Goddess in the forum, woman under guardianship.* | Forensic Architecture section; State Femininity concept. |
| ***In nummis domina, in legibus ancilla.*** | Chiasmic formula contrasting monetary sovereignty (*domina*) with normative servitude (*ancilla*). | *Senhora nas moedas, serva nas leis.* | *Mistress on coins, handmaiden in laws.* | Normative Regime; Numismatic/Paper currency corpus. |
| ***Vox legis, corpus sine suffragio.*** | Juxtaposes constitutional personification (*vox legis*) with electoral disenfranchisement (*corpus sine suffragio*). | *Voz da lei, corpo sem sufrágio.* | *Voice of the law, body without suffrage.* | Constitutional frontispieces; Suffrage dossiers (Columbia 1913). |
| ***Imago imperat, femina excluditur.*** | Four-word epigram condensing the political economy of the Visual Sexual Contract. | *A imagem governa, a mulher é excluída.* | *The image commands, the woman is excluded.* | Visual Sexual Contract definition. |
| ***Muta persona, loquens imago.*** | Classical rhetorical trope on visual eloquence and living silence. | *Persona muda, imagem falante.* | *Mute persona, speaking image.* | Acervo exploration header banner. |
| ***Imago vigilans · Nunc fluens, nunc stans.*** | Temporal dialectics (the flowing now vs. the enduring now). | *A imagem vigilante · O agora que flui, o agora que permanece.* | *Vigilant image · Now flowing, now standing.* | Seal of `/constelacoes` and temporal coexistences. |
| ***Patria feminea, civitas masculina.*** | Structural contradiction of republican statehood. | *Pátria feminina, cidadania masculina.* | *Feminine motherland, masculine citizenship.* | Operations section on homepage. |

---

## 7. Phased Implementation Roadmap & Verification Invariants

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: APPROVED WHOLE-SITE PLAN & SPECIFICATION (CURRENT)                           │
│ • Deliver docs/architectural-editorial-plan.md outside site/.                          │
│ • Establish PROJECT.md, task_plan.md, findings.md, progress.md.                        │
│ • Zero modifications inside site/; 100% test passing baseline.                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: ENGLISH REBRAND & TRANSLATION AUDIT                                           │
│ • Author native English static routes under site/en/ with root-relative asset URLs.    │
│ • Update Worker routing in src/index.js: declarative ROUTE_MAP, asset defense rewrite, │
│   HTTP 308 trailing slash redirects, context-aware 404, dynamic sitemap hreflang.     │
│ • Update client fetches in app.js, constellations.js, levels.js to root-relative paths.│
│ • Reconcile English copy with nominal architecture (Mnemosyne Viva / Mármore à Margem).│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: STRUCTURAL & CONTENT ENHANCEMENTS                                             │
│ • Canonical data serialization in scripts/build_data.py ("recorte_tese", "ano"),       │
│   schemas/acervo.schema.json, and golden test fixture updates.                         │
│ • Create dedicated surface: site/marmore-a-margem.html (Brazil 1822–1922).             │
│ • Symmetrical 6-surface navigation across all headers/footers and reciprocal breadcrumb│
│   cartouche (#ex-strand-context) on /acervo when ?recorte=tese is active.              │
│ • Restructure site/sobre.html into 4 intellectual modules.                             │
│ • Refactor openRecord modal and #ex-metadata in app.js into Camada I and Camada II.    │
│ • Run full test suite: publication sync, unit tests, node tests, browser tests.        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 7.1. Non-Negotiable Invariants
1. **Zero Build Steps & Zero Bundlers**:
   The static architecture of `site/` must be strictly preserved. No Webpack, Vite, Rollup, Tailwind compiler, or frontend framework runtimes.
2. **Design System Token Preservation**:
   Strict compliance with `AGENTS.md` ("mexer no design é dano, não melhoria"):
   - Lavender canvas: `#b99aee`
   - Reading lilac: `#ede4ff`
   - Violet ink: `#25103f`
   - Muted violet: `#49335f`
   - Acid yellow action: `#e4ff38` (sole action accent)
   - Anchor violet: `#6524bd`
   - Hairline lilac border: `#aa89c9`
   - Typography: Instrument Serif, Crimson Pro, JetBrains Mono.
3. **Repository Directory Isolation**:
   All planning files, analysis artifacts, and private manifests must remain outside `site/`. Wrangler must deploy only public production assets.
4. **Publication Integrity**:
   No draft or unapproved items in `review` or `withheld` may be exposed publicly. Retired composite scores remain permanently blocked.

---

## 8. Independent Verification Protocol

To independently verify this plan against the codebase and confirm that zero regressions exist:

```bash
# 1. Publication Sync & Archival Gate Verification
uv run --with jsonschema python3 scripts/publication_sync.py --check
# Expected: Exit code 0 ("Preservados 337 itens da base; 0 adições; 2 suplementos; 1 constelações aprovadas.")

# 2. Python Unit Test Suite (110 tests)
uv run --with jsonschema python3 -m unittest discover -s tests -v
# Expected: Exit code 0 ("Ran 110 tests ... OK (skipped=1)")

# 3. Node Integration & Worker Route Test Suite (50 tests)
node --test tests/test_*.mjs
# Expected: Exit code 0 ("ℹ pass 50, ℹ fail 0")

# 4. Playwright End-to-End Browser Test Suite (146 tests)
npm run test:browser
# Expected: Exit code 0 ("146 passed")

# 5. Confirm Zero Changes Inside site/
git status site/
# Expected: clean working tree under site/
```
