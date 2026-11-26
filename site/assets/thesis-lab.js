/* ICONOCRACIA — Laboratório metodológico:
   1. Linha do tempo dupla «Lei vs. Mármore» (marmore-a-margem.html)
   2. Matriz de Cruzamento Conceitual (sobre.html)
   3. Caderno de Vínculos Justificados (sobre.html, a partir de research-links.json) */
(() => {
  'use strict';

  const isEn = () => document.documentElement?.getAttribute('data-lang') === 'en' || document.documentElement?.lang?.startsWith('en');
  const tr = (pt, en) => (isEn() ? en : pt);
  const basePrefix = () => (location.pathname.startsWith('/en') ? '/en' : '');
  const dataPrefix = () => (location.pathname.startsWith('/en') ? '/data/' : 'data/');
  const assetPrefix = () => (location.pathname.startsWith('/en') ? '/assets/' : 'assets/');

  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const yearOf = (item) => Number(String(item.data || '').match(/\b\d{4}\b/)?.[0]) || null;
  const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const shortTitle = (item) => String(item.titulo || '').replace(/\s*\([^)]*\)\s*$/, '');
  const archiveUrl = (params) => {
    const base = basePrefix() ? '/en/acervo' : 'acervo.html';
    return params ? `${base}?${params}` : base;
  };

  let acervoPromise = null;
  function loadAcervo() {
    if (!acervoPromise) {
      acervoPromise = fetch(dataPrefix() + 'acervo.json').then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }
    return acervoPromise;
  }

  /* ── 1. LINHA DO TEMPO DUPLA: LEI VS. MÁRMORE (1822–1922 + SOBREVIDAS) ── */
  const ACTS = [
    {
      id: 'ato-1',
      span: '1822–1888',
      labelPt: 'Ato I · Império (1822–1888)',
      labelEn: 'Act I · Empire (1822–1888)',
      lawTitlePt: 'Constituição de 1824 & Ordem Patriarcal-Escravista',
      lawTitleEn: '1824 Constitution & Patriarchal Slaveholding Order',
      lawTextPt: 'A Carta de 1824 institui o voto censitário masculino e mantém a ordem privada sob as Ordenações Filipinas: a mulher casada permanece sob o poder marital, enquanto o território é figurado em alegorias imperiais e indigenistas.',
      lawTextEn: 'The 1824 Charter establishes male property-based suffrage and preserves private law under the Philippine Ordinances: married women remain under marital power while the territory is figured in imperial and indigenist allegories.',
      match: (item) => {
        if (item.pais !== 'Brasil') return false;
        const y = yearOf(item);
        if (y !== null) return y >= 1822 && y <= 1888;
        return /xix\b/.test(normalize(item.data));
      },
    },
    {
      id: 'ato-2',
      span: '1889–1915',
      labelPt: 'Ato II · República & 1891 (1889–1915)',
      labelEn: 'Act II · Republic & 1891 (1889–1915)',
      lawTitlePt: 'Proclamação de 1889 & Constituição de 1891 (exclusão do sufrágio)',
      lawTitleEn: '1889 Proclamation & 1891 Constitution (exclusion from suffrage)',
      lawTextPt: 'A República substitui o retrato de D. Pedro II pela efígie feminina com barrete frígio em moedas, selos e telas positivistas, no mesmo instante em que a Constituinte de 1891 recusa às mulheres o direito ao alistamento eleitoral.',
      lawTextEn: 'The Republic replaces Emperor Pedro II’s portrait with the female effigy in a Phrygian cap on coins, stamps, and positivist canvases at the exact moment the 1891 Constituent Assembly refuses women voter registration.',
      match: (item) => {
        if (item.pais !== 'Brasil') return false;
        const y = yearOf(item);
        return y !== null && y >= 1889 && y <= 1915;
      },
    },
    {
      id: 'ato-3',
      span: '1916–1922',
      labelPt: 'Ato III · Código Civil 1916 & Centenário',
      labelEn: 'Act III · 1916 Civil Code & Centenary',
      lawTitlePt: 'Código Civil de 1916 (art. 6º, II) — Tutela marital & Centenário de 1922',
      lawTitleEn: '1916 Civil Code (Art. 6, II) — Marital Tutela & 1922 Centenary',
      lawTextPt: 'A Lei nº 3.071/1916 inscreve a mulher casada entre os relativamente incapazes. Enquanto a lei positiva codifica a tutela conjugal, o Centenário da Independência multiplica estátuas, medalhas e cédulas com o corpo feminino soberano.',
      lawTextEn: 'Law No. 3,071/1916 classifies married women as relatively incapable. While positive law codifies conjugal guardianship, the 1922 Independence Centenary multiplies statues, medals, and banknotes featuring the sovereign female body.',
      match: (item) => {
        if (item.pais !== 'Brasil') return false;
        const y = yearOf(item);
        return y !== null && y >= 1916 && y <= 1922;
      },
    },
    {
      id: 'sobrevidas',
      span: 'Pós-1922',
      labelPt: 'Sobrevidas forenses (1923–1961+)',
      labelEn: 'Forensic afterlives (1923–1961+)',
      lawTitlePt: 'Sufrágio (1932), Estado Novo & Justiça no STF (1961)',
      lawTitleEn: 'Suffrage (1932), Estado Novo & STF Justice (1961)',
      lawTextPt: 'Mesmo após o Código Eleitoral de 1932 (sufrágio feminino) e até a escultura de Ceschiatti diante do STF (1961), o repertório neoclássico petrificado persiste em moedas do Cruzeiro, monumentos e arquitetura forense.',
      lawTextEn: 'Even after the 1932 Electoral Code (women’s suffrage) and up to Ceschiatti’s sculpture before the Supreme Federal Court (1961), the petrified neoclassical repertoire persists across Cruzeiro currency, monuments, and forensic architecture.',
      match: (item) => {
        if (item.pais !== 'Brasil') return false;
        const y = yearOf(item);
        return y !== null && y > 1922;
      },
    },
  ];

  function initTimeline() {
    const root = document.getElementById('lei-marmore-timeline');
    if (!root) return;

    let activeActId = 'ato-2';
    let cachedItems = [];

    function render() {
      root.replaceChildren();
      const act = ACTS.find((a) => a.id === activeActId) || ACTS[0];
      const matches = cachedItems.filter(act.match);

      const tabs = node('div', 'lm-tabs');
      tabs.setAttribute('role', 'tablist');
      tabs.setAttribute('aria-label', tr('Atos histórico-jurídicos (Brasil)', 'Historical-legal acts (Brazil)'));

      ACTS.forEach((entry) => {
        const count = cachedItems.filter(entry.match).length;
        const btn = node('button', 'lm-tab');
        btn.type = 'button';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', String(entry.id === activeActId));
        btn.append(
          node('span', 'lm-tab-span', entry.span),
          node('span', 'lm-tab-label', tr(entry.labelPt, entry.labelEn)),
          node('span', 'lm-tab-count', `${count}`),
        );
        btn.addEventListener('click', () => {
          activeActId = entry.id;
          render();
        });
        tabs.append(btn);
      });

      const stage = node('div', 'lm-stage');
      stage.setAttribute('role', 'tabpanel');

      const lawTrack = node('div', 'lm-track lm-track--law');
      lawTrack.append(
        node('p', 'lm-track-kicker', tr('CAMADA NORMATIVA · IN IURE TACET', 'NORMATIVE TRACK · IN IURE TACET')),
        node('h3', '', tr(act.lawTitlePt, act.lawTitleEn)),
        node('p', '', tr(act.lawTextPt, act.lawTextEn)),
      );

      const marbleTrack = node('div', 'lm-track lm-track--marble');
      const mHead = node('div', 'lm-marble-head');
      mHead.append(
        node('p', 'lm-track-kicker', tr(`CORPO ALEGÓRICO · IN MARMORE REGNAT (${matches.length} registros no acervo)`, `ALLEGORICAL BODY · IN MARMORE REGNAT (${matches.length} archive records)`)),
      );

      const compareSample = matches.filter((m) => m.tem_imagem).slice(0, 3).map((m) => m.id);
      if (compareSample.length >= 2) {
        const cmpLink = node('a', 'btn btn-ghost lm-compare-link', tr('Abrir amostra na Mesa de Montagem ↗', 'Open sample in Montage Workbench ↗'));
        cmpLink.href = archiveUrl('comparar=' + encodeURIComponent(compareSample.join(',')));
        mHead.append(cmpLink);
      }
      marbleTrack.append(mHead);

      const strip = node('div', 'lm-cards');
      matches.slice(0, 6).forEach((item) => {
        const card = node('a', 'lm-card');
        card.href = archiveUrl('item=' + encodeURIComponent(item.id));
        const fig = node('figure');
        if (item.tem_imagem) {
          const img = node('img');
          img.src = assetPrefix() + 'acervo/' + encodeURIComponent(item.id) + '.webp';
          img.alt = item.texto_alternativo || item.titulo;
          img.loading = 'lazy';
          img.decoding = 'async';
          fig.append(img);
        }
        const cap = node('figcaption');
        cap.append(
          node('span', 'lm-card-meta', `${item.id} · ${item.data || 's.d.'}`),
          node('strong', '', shortTitle(item)),
          node('span', 'pill regime', item.regime || '—'),
        );
        fig.append(cap);
        card.append(fig);
        strip.append(card);
      });
      marbleTrack.append(strip);

      const foot = node('div', 'lm-foot');
      const allLink = node(
        'a',
        'btn btn-primary',
        act.id === 'sobrevidas'
          ? tr('Ver todos os registros do Brasil no acervo ↗', 'View all Brazilian records in the archive ↗')
          : tr('Explorar os 53 itens do recorte Brasil (1822–1922) ↗', 'Explore all 53 items of the Brazil (1822–1922) strand ↗'),
      );
      allLink.href = act.id === 'sobrevidas' ? archiveUrl('pais=Brasil') : archiveUrl('recorte=tese');
      foot.append(allLink);
      marbleTrack.append(foot);

      stage.append(lawTrack, marbleTrack);
      root.append(tabs, stage);
    }

    loadAcervo()
      .then((data) => {
        cachedItems = Array.isArray(data) ? data : [];
        render();
      })
      .catch(() => {
        root.textContent = tr('Não foi possível carregar os registros da linha do tempo.', 'Could not load timeline records.');
      });
  }

  /* ── 2. MATRIZ DE CRUZAMENTO CONCEITUAL (sobre.html) ── */
  const CONCEPTS = [
    {
      id: 'csv',
      namePt: 'Contrato Sexual Visual',
      nameEn: 'Visual Sexual Contract',
      motto: 'Imago imperat, femina excluditur',
      summaryPt: 'Economia política da visibilidade: convoca o feminino como emblema de soberania enquanto ausenta as mulheres reais da cidadania.',
      summaryEn: 'Political economy of visibility: summons the feminine as an emblem of sovereignty while absenting living women from citizenship.',
      examples: ['US-008', 'BR-005', 'FR-008'],
    },
    {
      id: 'fe',
      namePt: 'Feminilidade de Estado',
      nameEn: 'State Femininity',
      motto: 'Dea in foro, mulier sub tutela',
      summaryPt: 'Efeito subjetivo sobre o corpo alegórico: a feminilidade institucionalizada opera como fachada da lei e da autoridade estatal.',
      summaryEn: 'Subjective effect on the allegorical body: institutionalized femininity operates as the facade of law and state authority.',
      examples: ['BR-009', 'FR-CERES-5F-1849', 'UK-TRADE-1895'],
    },
    {
      id: 'crv',
      namePt: 'Contrato Racial Visual',
      nameEn: 'Visual Racial Contract',
      motto: 'Corpus Brasiliae, ius virorum',
      summaryPt: 'Distribuição racial desigual da forma «universal»: branquitude neoclássica transplantada por matrizes transatlânticas.',
      summaryEn: 'Unequal racial distribution of the "universal" form: neoclassical whiteness transplanted through transatlantic matrices.',
      examples: ['BR-005', 'BR-001', 'BR-003'],
    },
    {
      id: 'pc',
      namePt: 'Purificação Clássica',
      nameEn: 'Classical Purification',
      motto: 'Matrix errans, lex immobilis',
      summaryPt: 'Mecanismo formal observável: rigidez postural, apagamento do gesto e uniformização facial que tornam os demais conceitos comparáveis no acervo.',
      summaryEn: 'Observable formal mechanism: postural rigidity, erasure of gesture, and facial standardization that make the other concepts comparable across the archive.',
      examples: ['BR-002', 'FR-SEM-1898', 'DE-GERM-1900'],
    },
  ];

  function initConceptMatrix() {
    const root = document.getElementById('concept-matrix');
    if (!root) return;

    let activeId = 'csv';
    let cachedItems = [];

    function render() {
      root.replaceChildren();
      const concept = CONCEPTS.find((c) => c.id === activeId) || CONCEPTS[0];
      const byId = new Map(cachedItems.map((x) => [x.id, x]));
      const exemplars = concept.examples.map((id) => byId.get(id)).filter(Boolean);

      const nav = node('div', 'cm-selector');
      nav.setAttribute('role', 'tablist');
      nav.setAttribute('aria-label', tr('Conceitos da Iconocracia', 'Iconocracia concepts'));
      CONCEPTS.forEach((c) => {
        const btn = node('button', 'cm-btn');
        btn.type = 'button';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', String(c.id === activeId));
        btn.append(
          node('span', 'cm-btn-name', tr(c.namePt, c.nameEn)),
          node('span', 'cm-btn-motto', c.motto),
        );
        btn.addEventListener('click', () => {
          activeId = c.id;
          render();
        });
        nav.append(btn);
      });

      const panel = node('div', 'cm-panel');
      panel.setAttribute('role', 'tabpanel');
      panel.append(
        node('p', 'cm-panel-motto', concept.motto),
        node('h3', '', tr(concept.namePt, concept.nameEn)),
        node('p', 'cm-panel-desc', tr(concept.summaryPt, concept.summaryEn)),
      );

      if (exemplars.length) {
        const exHead = node('div', 'cm-ex-head');
        exHead.append(
          node('span', 'lm-track-kicker', tr('OBRAS-ÂNCORA NO ACERVO', 'ANCHOR WORKS IN THE ARCHIVE')),
        );
        if (exemplars.length >= 2) {
          const cmp = node('a', 'btn btn-ghost cm-cmp', tr('Comparar estas obras na Mesa de Montagem ↗', 'Compare these works in the Montage Workbench ↗'));
          cmp.href = archiveUrl('comparar=' + encodeURIComponent(exemplars.map((e) => e.id).join(',')));
          exHead.append(cmp);
        }
        panel.append(exHead);

        const grid = node('div', 'cm-cards');
        exemplars.forEach((item) => {
          const card = node('a', 'lm-card');
          card.href = archiveUrl('item=' + encodeURIComponent(item.id));
          const fig = node('figure');
          if (item.tem_imagem) {
            const img = node('img');
            img.src = assetPrefix() + 'acervo/' + encodeURIComponent(item.id) + '.webp';
            img.alt = item.texto_alternativo || item.titulo;
            img.loading = 'lazy';
            fig.append(img);
          }
          const cap = node('figcaption');
          cap.append(
            node('span', 'lm-card-meta', `${item.id} · ${item.pais}, ${item.data || 's.d.'}`),
            node('strong', '', shortTitle(item)),
          );
          fig.append(cap);
          card.append(fig);
          grid.append(card);
        });
        panel.append(grid);
      }

      root.append(nav, panel);
    }

    loadAcervo()
      .then((data) => {
        cachedItems = Array.isArray(data) ? data : [];
        render();
      })
      .catch(() => {
        render();
      });
  }

  /* ── 3. CADERNO DE VÍNCULOS JUSTIFICADOS (sobre.html) ── */
  function initResearchLinks() {
    const root = document.getElementById('research-links-ledger');
    if (!root) return;

    fetch(dataPrefix() + 'research-links.json')
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((payload) => {
        root.replaceChildren();
        const note = node('p', 'ex-method-note rl-note', tr(payload.epistemic_note_pt, payload.epistemic_note_en));
        root.append(note);

        const list = node('div', 'rl-list');
        (payload.links || []).forEach((link) => {
          const card = node('article', 'rl-card');

          const head = node('header', 'rl-head');
          const badges = node('div', 'rl-badges');
          badges.append(
            node('span', `rl-badge rl-badge--${link.status}`, tr(link.status_label_pt, link.status_label_en)),
            node('span', 'rl-badge rl-badge--rel', tr(link.relation_label_pt, link.relation_label_en)),
            node('span', 'rl-id', link.id),
          );
          head.append(badges, node('h3', '', tr(link.title_pt, link.title_en)));
          card.append(head);

          // Ponta A <-> Ponta B
          const bridge = node('div', 'rl-bridge');
          const boxA = node('div', 'rl-ponta');
          boxA.append(
            node('span', 'rl-ponta-tag', tr('PONTA A · ACHADO EMPÍRICO / FONTE', 'END A · EMPIRICAL FINDING / SOURCE')),
            node('strong', '', tr(link.ponta_a.source_pt, link.ponta_a.source_en)),
            node('blockquote', '', tr(link.ponta_a.excerpt_pt, link.ponta_a.excerpt_en)),
          );
          const boxB = node('div', 'rl-ponta');
          boxB.append(
            node('span', 'rl-ponta-tag', tr('PONTA B · FORMULAÇÃO TEÓRICA', 'END B · THEORETICAL FORMULATION')),
            node('strong', '', tr(link.ponta_b.source_pt, link.ponta_b.source_en)),
            node('blockquote', '', tr(link.ponta_b.excerpt_pt, link.ponta_b.excerpt_en)),
          );
          bridge.append(boxA, boxB);
          card.append(bridge);

          // 3 Epistemic Tabs
          const tabsData = [
            {
              key: 'evidencia',
              label: tr('Documentado vs. Interpretação', 'Documented vs. Interpretation'),
              leftLabel: tr('Documentado (Camada I)', 'Documented (Layer I)'),
              leftText: tr(link.documentado_pt, link.documentado_en),
              rightLabel: tr('Interpretação (Camada II)', 'Interpretation (Layer II)'),
              rightText: tr(link.interpretacao_pt, link.interpretacao_en),
            },
            {
              key: 'limite',
              label: tr('Ganho & Limite Crítico', 'Gain & Critical Limit'),
              leftLabel: tr('Ganho epistemológico', 'Epistemological gain'),
              leftText: tr(link.ganho_pt, link.ganho_en),
              rightLabel: tr('Limite crítico', 'Critical limit'),
              rightText: tr(link.limite_pt, link.limite_en),
            },
            {
              key: 'objecao',
              label: tr('Objeção & Próxima Verificação', 'Objection & Next Verification'),
              leftLabel: tr('Objeção / hipótese alternativa', 'Objection / alternative hypothesis'),
              leftText: tr(link.objecao_pt, link.objecao_en),
              rightLabel: tr('Próxima verificação arquivística', 'Next archival verification'),
              rightText: tr(link.verificacao_pt, link.verificacao_en),
            },
          ];

          let activeTab = 'evidencia';
          const tabBar = node('div', 'rl-tabs');
          tabBar.setAttribute('role', 'tablist');
          const tabBody = node('div', 'rl-tab-body');
          tabBody.setAttribute('role', 'tabpanel');

          function renderTabs() {
            tabBar.replaceChildren();
            tabBody.replaceChildren();
            tabsData.forEach((t) => {
              const b = node('button', 'rl-tab', t.label);
              b.type = 'button';
              b.setAttribute('role', 'tab');
              b.setAttribute('aria-selected', String(t.key === activeTab));
              b.addEventListener('click', () => {
                activeTab = t.key;
                renderTabs();
              });
              tabBar.append(b);
            });
            const cur = tabsData.find((t) => t.key === activeTab) || tabsData[0];
            const col1 = node('div', 'rl-col');
            col1.append(node('span', 'rl-col-label', cur.leftLabel), node('p', '', cur.leftText));
            const col2 = node('div', 'rl-col');
            col2.append(node('span', 'rl-col-label', cur.rightLabel), node('p', '', cur.rightText));
            tabBody.append(col1, col2);
          }

          renderTabs();
          card.append(tabBar, tabBody);

          if (link.corpus_item_id) {
            const foot = node('div', 'rl-foot');
            const a = node('a', 'btn btn-ghost', tr(`Inspecionar obra relacionada (${link.corpus_item_id}) ↗`, `Inspect related work (${link.corpus_item_id}) ↗`));
            a.href = archiveUrl('item=' + encodeURIComponent(link.corpus_item_id));
            foot.append(a);
            card.append(foot);
          }

          list.append(card);
        });

        root.append(list);
      })
      .catch(() => {
        root.textContent = tr('Não foi possível carregar o caderno de vínculos.', 'Could not load the research links ledger.');
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTimeline();
    initConceptMatrix();
    initResearchLinks();
  });
})();
