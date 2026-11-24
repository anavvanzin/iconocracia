/* ICONOCRACIA — exposição, filtros e fichas do recorte publicado. */
(() => {
  'use strict';
  function debounce(fn, ms) {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }
  const publication = window.IconocraciaPublication;
  const $ = (selector) => document.querySelector(selector);
  const isEn = () => document.documentElement?.getAttribute('data-lang') === 'en';
  const tr = (pt, en) => isEn() ? en : pt;
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const safeURL = (value) => /^https?:\/\//i.test(value || '');
  const shortTitle = (item) => item.titulo.replace(/\s*\([^)]*\)\s*$/, '');
  const yearOf = (item) => Number(String(item.data).match(/\b\d{4}\b/)?.[0]) || null;
  const centuryOf = (item) => { const year = yearOf(item); return year ? String(Math.floor((year - 1) / 100) + 1) : 'sem-ano'; };
  const inThesisStrand = (item) => {
    if (item.pais !== 'Brasil') return false;
    const year = yearOf(item);
    if (year !== null) return year >= 1822 && year <= 1922;
    return /xix\b/.test(normalize(item.data));
  };
  // Agrupamento de navegação derivado do suporte; o valor original permanece na ficha.
  function typeOf(item) {
    const support = normalize(item.suporte);
    if (/photograph|photogra|albumen|salted paper/.test(support)) return 'Fotografia';
    if (/sculpture|relief|bust/.test(support)) return 'Escultura';
    if (/poster|affiche|cartaz/.test(support)) return 'Cartaz';
    if (/oil|painting|pintura|decorative panel/.test(support)) return 'Pintura';
    if (/coin|money|moeda|cedula/.test(support)) return 'Moeda e cédula';
    if (/print|engraving|etching|lithogra|gravura|estampe|woodcut|drawing|desenho/.test(support)) return 'Gravura e desenho';
    if (/manuscript|periodical/.test(support)) return 'Documento';
    return 'Outros suportes';
  }
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function reproduce(item, container, lazy = false) {
    if (!item.tem_imagem) {
      container.append(node('span', 'ex-missing', 'Sem reprodução disponível. Consulte o arquivo de origem.'));
      return;
    }
    const img = node('img');
    img.alt = item.texto_alternativo || item.titulo;
    img.decoding = 'async';
    img.loading = lazy ? 'lazy' : 'eager';
    img.src = publication ? publication.imageSource(item) : 'assets/acervo/' + encodeURIComponent(item.id) + '.webp';
    let fallback = false;
    img.addEventListener('error', () => {
      // renderSelected reuses #ex-image. A 404 from the previous work must not
      // replaceChildren on the stage after that img has already been detached.
      if (img.parentNode !== container) return;
      const sourceURL = item.imagem_fonte || item.imagem;
      const imageURL = publication ? publication.imageURL(sourceURL) : (safeURL(sourceURL) ? sourceURL : null);
      if (!fallback && imageURL && imageURL !== img.getAttribute('src')) { fallback = true; img.src = imageURL; }
      else container.replaceChildren(node('span', 'ex-missing', 'Reprodução indisponível. Consulte o arquivo de origem.'));
    });
    container.append(img);
  }
  const archiveHref = (query) => {
    const base = location.pathname.startsWith('/en') ? '/en/acervo' : 'acervo.html';
    return query ? `${base}?${query}` : base;
  };
  function renderAtlasLens(stats) {
    const host = $('#atlas-lens');
    if (!host || !stats) return;
    host.replaceChildren();
    const grid = node('div', 'atlas-lens-grid');

    // Column 1: Three interpretive regimes (preserving taxonomy distinction)
    const regCol = node('div', 'atlas-lens-col');
    regCol.append(
      node('p', 'atlas-lens-kicker', tr('REGIMES INTERPRETATIVOS (3)', 'INTERPRETIVE REGIMES (3)')),
      node('p', 'atlas-lens-sub', tr('Clique em qualquer barra para abrir esse recorte no acervo.', 'Click any bar to open that slice in the archive.')),
    );
    const regimes = Array.isArray(stats.por_regime) ? stats.por_regime : [];
    const maxReg = Math.max(1, ...regimes.map((r) => r.n || 0));
    const regList = node('div', 'atlas-lens-bars');
    regimes.forEach((r) => {
      const a = node('a', 'atlas-bar-row');
      a.href = archiveHref('regime=' + encodeURIComponent(r.regime));
      const label = node('span', 'atlas-bar-label', r.regime);
      const track = node('span', 'atlas-bar-track');
      const fill = node('span', `atlas-bar-fill atlas-bar-fill--${normalize(r.regime)}`);
      fill.style.width = Math.max(4, Math.round((r.n / maxReg) * 100)) + '%';
      track.append(fill);
      const count = node('span', 'atlas-bar-count', String(r.n));
      a.append(label, track, count);
      regList.append(a);
    });
    regCol.append(regList);
    const legacy = (stats.por_rotulo_catalogado || []).find((r) => normalize(r.regime) === 'contra-alegoria');
    if (legacy) {
      const note = node('p', 'atlas-lens-note');
      note.append(
        document.createTextNode(
          tr(
            `Nota metodológica: «Contra-alegoria» (${legacy.n} registros com rótulo legado) opera como teste crítico, não como quarto regime. `,
            `Methodological note: "Counter-allegory" (${legacy.n} legacy-labeled records) operates as a critical test, not a fourth regime. `,
          ),
        ),
      );
      const link = node('a', '', tr('Ver rótulo legado no acervo ↗', 'View legacy label in archive ↗'));
      link.href = archiveHref('regime=' + encodeURIComponent(legacy.regime));
      note.append(link);
      regCol.append(note);
    }

    // Column 2: Top jurisdictions
    const countryCol = node('div', 'atlas-lens-col');
    countryCol.append(
      node('p', 'atlas-lens-kicker', tr('HORIZONTE COMPARATIVO (17 JURISDIÇÕES)', 'COMPARATIVE HORIZON (17 JURISDICTIONS)')),
      node('p', 'atlas-lens-sub', tr('País como variável analítica transnacional — principais conjuntos:', 'Country as a transnational analytical variable — largest holdings:')),
    );
    const countries = (Array.isArray(stats.por_pais) ? stats.por_pais : []).slice(0, 8);
    const maxCountry = Math.max(1, ...countries.map((c) => c.n || 0));
    const countryList = node('div', 'atlas-lens-bars');
    countries.forEach((c) => {
      const a = node('a', 'atlas-bar-row');
      a.href = archiveHref('pais=' + encodeURIComponent(c.pais));
      const label = node('span', 'atlas-bar-label', c.pais);
      const track = node('span', 'atlas-bar-track');
      const fill = node('span', c.pais === 'Brasil' ? 'atlas-bar-fill atlas-bar-fill--br' : 'atlas-bar-fill');
      fill.style.width = Math.max(4, Math.round((c.n / maxCountry) * 100)) + '%';
      track.append(fill);
      const count = node('span', 'atlas-bar-count', String(c.n));
      a.append(label, track, count);
      countryList.append(a);
    });
    countryCol.append(countryList);

    grid.append(regCol, countryCol);
    host.append(grid);
  }
  const searchShortcut = $('.ex-search-shortcut');
  searchShortcut?.addEventListener('click', () => {
    if ($('#q')) $('#q').focus(); else location.href = archiveHref('buscar=1');
  });
  if ($('[data-stat]') || $('#atlas-lens')) {
    fetch('data/stats.json').then((response) => response.json()).then((stats) => {
      document.querySelectorAll('[data-stat]').forEach((el) => {
        el.textContent = el.dataset.stat === 'periodo' ? stats.periodo.min + '–' + stats.periodo.max : stats[el.dataset.stat];
      });
      renderAtlasLens(stats);
    }).catch(() => {});
  }
  if (!$('.exhibition')) {
    if (publication && $('[data-constellations-link]')) {
      fetch('data/acervo.json').then(response => {
        if (!response.ok) throw new Error('Acervo indisponível');
        return response.json();
      }).then(data => {
        if (!Array.isArray(data)) throw new Error('Acervo inválido');
        return publication.loadContext(data);
      }).then(context => publication.showNavigation(context.constellations)).catch(() => {});
    }
    // Preserve collection links shared before the homepage became an introduction.
    if ($('.ex-home') && new URLSearchParams(location.search).has('item')) {
      location.replace('acervo.html' + location.search + location.hash);
    }
    return;
  }

  let items = [], filtered = [], selected = null, activeConstellation = null;
  const fields = { q: $('#q'), pais: $('#f-pais'), regime: $('#f-regime'), periodo: $('#f-periodo'), tipo: $('#f-tipo') };
  const params = new URLSearchParams(location.search);
  let activeStrand = params.get('recorte') === 'tese' ? 'tese' : '';
  const strandAll = $('#strand-all'), strandTese = $('#strand-tese'), strandContext = $('#ex-strand-context');
  const stage = $('.ex-stage'), strip = $('#ex-filmstrip'), grid = $('#ex-grid'), constellation = $('#ex-constellation');
  const VIEWS = ['constelacao', 'palco', 'grade'];
  let view = VIEWS.includes(params.get('visao')) ? params.get('visao') : 'constelacao';
  let selectionLinked = params.has('item'), constellationWidth = 0, constellationSmall = false, dialogReturnFocus = null;
  // Layout da constelação: determinístico, semeado pelo id da obra — o campo é estável entre visitas.
  const hashId = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const mulberry = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const dialog = node('dialog', 'ex-dialog');
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  document.body.append(dialog);
  function closeRecord() {
    if (view === 'constelacao') { selectionLinked = false; syncURL(); }
    dialog.close();
  }
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeRecord(); });
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeRecord(); });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    document.body.style.overflow = '';
    const target = dialogReturnFocus?.isConnected ? dialogReturnFocus : selectedFrame();
    if (target?.classList.contains('ex-star')) focusFrame(target);
    else target?.focus({ preventScroll: true });
  });
  const selectedFrame = () => [...constellation.querySelectorAll('.ex-star')].find(frame => frame.dataset.id === selected?.id);
  function focusFrame(frame) {
    if (!frame) return;
    const top = frame.offsetTop, bottom = top + frame.offsetHeight;
    if (top < constellation.scrollTop) constellation.scrollTop = Math.max(0, top - 20);
    else if (bottom > constellation.scrollTop + constellation.clientHeight) constellation.scrollTop = bottom - constellation.clientHeight + 20;
    frame.focus({ preventScroll: true });
  }

  function fillOptions(element, values, label = (value) => value) {
    [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt', { numeric: true })).forEach((value) => {
      const option = node('option', '', label(value)); option.value = value; element.append(option);
    });
  }
  const interpretiveRegimes = new Set(['fundacional', 'normativo', 'militar']);
  const isLegacyClassification = value => normalize(value) === 'contra-alegoria';
  const classificationLabel = value => isLegacyClassification(value) ? `${value} (rótulo legado)` : value;
  function fillClassifications(values) {
    const groups = [
      ['Regimes interpretativos', value => interpretiveRegimes.has(normalize(value))],
      ['Classificações legadas', isLegacyClassification],
      ['Outros rótulos catalogados', value => !interpretiveRegimes.has(normalize(value)) && !isLegacyClassification(value)],
    ];
    for (const [label, accepts] of groups) {
      const options = values.filter(value => value && accepts(value));
      if (!options.length) continue;
      const group = node('optgroup'); group.label = label;
      // Labels clarify status; values and shared ?regime= links retain exact matching.
      fillOptions(group, options, classificationLabel);
      fields.regime.append(group);
    }
  }
  function syncURL() {
    const url = new URL(location.href);
    for (const [key, el] of Object.entries(fields)) {
      if (el.value) url.searchParams.set(key, el.value); else url.searchParams.delete(key);
    }
    if (activeStrand === 'tese') url.searchParams.set('recorte', 'tese'); else url.searchParams.delete('recorte');
    if (selected && (view !== 'constelacao' || selectionLinked)) url.searchParams.set('item', selected.id); else url.searchParams.delete('item');
    url.searchParams.set('visao', view);
    if (activeConstellation) url.searchParams.set('constelacao', activeConstellation.slug);
    url.searchParams.delete('buscar');
    history.replaceState(null, '', url);
  }
  function filterItems() {
    const query = normalize(fields.q.value);
    const scoped = activeConstellation ? activeConstellation.item_ids.map(id => items.find(item => item.id === id)) : items;
    filtered = scoped.filter((item) => {
      if (activeStrand === 'tese' && !inThesisStrand(item)) return false;
      if (fields.pais.value && fields.pais.value !== item.pais) return false;
      if (fields.regime.value && fields.regime.value !== item.regime) return false;
      if (fields.periodo.value && fields.periodo.value !== centuryOf(item)) return false;
      if (fields.tipo.value && fields.tipo.value !== typeOf(item)) return false;
      return !query || item._hay.includes(query);
    });
    const previousId = selected?.id;
    selected = filtered.find((item) => item.id === previousId) || filtered[0] || null;
    if (view === 'constelacao' && selected?.id !== previousId) selectionLinked = false;
    strandAll?.setAttribute('aria-pressed', String(activeStrand !== 'tese'));
    strandTese?.setAttribute('aria-pressed', String(activeStrand === 'tese'));
    if (strandContext) {
      if (activeStrand === 'tese') {
        strandContext.hidden = false;
        strandContext.innerHTML = tr(
          '<span>Recorte Doutoral Ativo</span> · <em>Mármore à Margem (Brasil, 1822–1922) · In marmore regnat, in iure tacet</em> · <a href="marmore-a-margem.html">Ler ensaio do recorte →</a>',
          '<span>Active Doctoral Strand</span> · <em>Mármore à Margem (Brazil, 1822–1922) · In marmore regnat, in iure tacet</em> · <a href="/en/marmore-a-margem">Read strand essay →</a>'
        );
      } else {
        strandContext.hidden = true;
        strandContext.replaceChildren();
      }
    }
    $('#result-count').textContent = activeConstellation
      ? filtered.length + tr(' de ', ' of ') + scoped.length + tr(' obras · ', ' works · ') + activeConstellation.title
      : activeStrand === 'tese'
        ? filtered.length + tr(' de ', ' of ') + items.length + tr(' registros · Mármore à Margem (Brasil, 1822–1922)', ' records · Marble at the Margin (Brazil, 1822–1922)')
        : filtered.length + tr(' de ', ' of ') + items.length + tr(' registros · recorte do acervo', ' records · collection selection');
    $('#clear-filters').hidden = !Object.values(fields).some((el) => el.value) && !activeStrand;
    renderStrip();
    if (view === 'grade') renderGrid();
    if (view === 'constelacao') renderConstellation();
    renderSelected();
  }
  function setView(next) {
    if (next === 'constelacao' && view !== 'constelacao') selectionLinked = false;
    view = next;
    stage.hidden = strip.hidden = next !== 'palco';
    grid.hidden = next !== 'grade';
    constellation.hidden = next !== 'constelacao';
    // Constelação ocupa a largura toda: a ficha volta quando se abre a obra (diálogo).
    document.querySelector('.ex-layout').classList.toggle('ex-layout-wide', next === 'constelacao');
    document.body.classList.toggle('ex-ground-full', next === 'constelacao');
    $('#view-palco').setAttribute('aria-pressed', String(next === 'palco'));
    $('#view-grade').setAttribute('aria-pressed', String(next === 'grade'));
    $('#view-constelacao').setAttribute('aria-pressed', String(next === 'constelacao'));
    if (next === 'grade') renderGrid();
    if (next === 'constelacao') renderConstellation();
    syncURL();
  }
  function renderGrid() {
    grid.replaceChildren();
    filtered.forEach((item, i) => {
      const frame = node('button', 'ex-frame');
      frame.type = 'button'; frame.dataset.id = item.id;
      frame.setAttribute('aria-pressed', String(selected?.id === item.id));
      frame.setAttribute('aria-label', 'Selecionar ' + item.titulo);
      const image = node('span', 'ex-frame-image'); reproduce(item, image, true);
      frame.append(image, node('span', 'ex-frame-cap', String(i + 1).padStart(2, '0') + ' / ' + shortTitle(item) + ' · ' + item.pais + ', ' + item.data));
      frame.addEventListener('click', () => select(item));
      grid.append(frame);
    });
  }
  function renderConstellation() {
    constellation.replaceChildren();
    const small = matchMedia('(max-width:700px)').matches;
    const width = constellation.clientWidth || Math.max(240, document.documentElement.clientWidth - 40);
    constellationWidth = Math.round(width); constellationSmall = small;
    if (!filtered.length) {
      constellation.append(node('p', 'ex-empty', 'Nenhuma obra encontrada. Experimente outro termo ou limpe os filtros.'));
      return;
    }
    const cols = Math.max(1, Math.floor(width / (small ? 160 : 300)));
    const cellW = width / cols, cellH = small ? 360 : 300;
    const rows = Math.ceil(filtered.length / cols);
    const field = node('div', 'ex-const-field');
    field.style.width = width + 'px';
    field.style.height = Math.max(rows * cellH, 400) + 'px';
    const widths = [150, 190, 240];
    filtered.forEach((item, i) => {
      const rng = mulberry(hashId(item.id));
      const col = i % cols, row = Math.floor(i / cols);
      const w = small ? cellW - 16 : Math.min(widths[Math.floor(rng() * widths.length)], cellW - 40);
      const x = col * cellW + (small ? 8 : 20 + rng() * (cellW - w - 40));
      const y = row * cellH + 18 + rng() * (small ? 12 : cellH - w * 0.9 - 36);
      const rot = small ? '0' : (rng() * 14 - 7).toFixed(1);
      const frame = node('button', 'ex-star');
      frame.type = 'button'; frame.dataset.id = item.id;
      frame.style.left = x + 'px'; frame.style.top = Math.max(0, y) + 'px';
      frame.style.width = w + 'px'; frame.style.setProperty('--rot', rot + 'deg');
      frame.setAttribute('aria-pressed', String(selected?.id === item.id));
      frame.setAttribute('aria-label', 'Abrir ficha de ' + item.titulo);
      const image = node('span', 'ex-star-image'); reproduce(item, image, true);
      frame.append(image, node('span', 'ex-frame-cap', String(i + 1).padStart(2, '0') + ' / ' + shortTitle(item) + ' · ' + item.pais + ', ' + item.data));
      frame.addEventListener('click', () => { select(item); openRecord(); });
      field.append(frame);
    });
    constellation.append(field);
  }
  function renderStrip() {
    strip.replaceChildren();
    filtered.forEach((item) => {
      const button = node('button', 'ex-thumb');
      button.type = 'button'; button.dataset.id = item.id;
      button.setAttribute('aria-label', 'Selecionar ' + item.titulo);
      const frame = node('span', 'ex-thumb-image'); reproduce(item, frame, true);
      button.append(frame, node('span', 'ex-thumb-title', shortTitle(item)), node('span', 'ex-thumb-meta', item.pais + ', ' + item.data));
      button.addEventListener('click', () => select(item));
      strip.append(button);
    });
  }
  function select(item) { selectionLinked = true; selected = item; renderSelected(); }
  function navigate(step) {
    const index = filtered.indexOf(selected);
    if (filtered[index + step]) select(filtered[index + step]);
  }
  function buildBibTeX(item) {
    const key = String(item.id || 'iconocracia').replace(/[^A-Za-z0-9_-]/g, '_');
    const year = yearOf(item) || item.data || 's.d.';
    const author = item.autoria || 'Autoria não informada';
    const inst = item.instituicao || 'Acervo Mnemosyne Viva';
    const url = item.fonte_url || `https://iconocracia.com/acervo?item=${encodeURIComponent(item.id)}`;
    return [
      `@misc{${key},`,
      `  title = {${item.titulo}},`,
      `  author = {${author}},`,
      `  year = {${year}},`,
      `  howpublished = {${item.suporte || 'Registro iconográfico'} · ${inst}},`,
      `  note = {Mnemosyne Viva (ICONOCRACIA), registro ${item.id}},`,
      `  url = {${url}}`,
      `}`,
    ].join('\n');
  }
  function claimTypeLabel(type) {
    const map = {
      iconographic: tr('Leitura iconográfica', 'Iconographic reading'),
      legal_context: tr('Contexto jurídico-político', 'Legal-political context'),
      postcolonial_marker: tr('Marcador pós-colonial / racial', 'Postcolonial / racial marker'),
    };
    return map[type] || tr('Nota interpretativa', 'Interpretive note');
  }
  function claimStatusLabel(status) {
    if (status === 'supported') return tr('Sustentado em fonte', 'Source-supported');
    return tr('Hipótese em revisão', 'Working hypothesis');
  }
  function copyTextWithFeedback(text, button, doneText) {
    const orig = button.textContent;
    const finish = () => {
      button.textContent = doneText;
      setTimeout(() => { button.textContent = orig; }, 1800);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(finish).catch(finish);
    else finish();
  }
  const compare = window.IconocraciaCompare?.createWorkbench({
    resolveItem: (all, id) => (publication ? publication.resolveItem(all, id) : all.find((x) => x.id === id)),
    imageSource: (item) => (publication ? publication.imageSource(item) : 'assets/acervo/' + encodeURIComponent(item.id) + '.webp'),
    classificationLabel,
    inThesisStrand,
    onOpenSingle: (item) => { select(item); openRecord(); },
    onChange: () => {
      updateCompareButtons();
    },
  }) || null;
  function updateCompareButtons() {
    const btn = $('#ex-compare-toggle');
    if (btn && selected && compare) {
      const pinned = compare.has(selected.id);
      btn.setAttribute('aria-pressed', String(pinned));
      const span = btn.querySelector('span');
      if (span) span.textContent = pinned ? tr('Na Mesa de Montagem ✓', 'In Montage Workbench ✓') : tr('Fixar na Mesa de Montagem', 'Pin to Montage Workbench');
    }
    constellation.querySelectorAll('.ex-star').forEach((frame) => {
      frame.classList.toggle('is-pinned', !!(compare && compare.has(frame.dataset.id)));
    });
    grid.querySelectorAll('.ex-frame').forEach((frame) => {
      frame.classList.toggle('is-pinned', !!(compare && compare.has(frame.dataset.id)));
    });
  }
  function renderSelected() {
    const index = filtered.indexOf(selected);
    $('.ex-prev').disabled = index <= 0;
    $('.ex-next').disabled = index < 0 || index >= filtered.length - 1;
    $('#ex-open').disabled = !selected;
    $('#ex-more').disabled = !selected;
    if ($('#ex-compare-toggle')) $('#ex-compare-toggle').disabled = !selected;
    $('.ex-expand').disabled = !selected?.tem_imagem;
    $('#ex-image').replaceChildren();
    $('#ex-metadata').replaceChildren();
    $('#ex-source').hidden = !selected || !safeURL(selected.fonte_url);
    if (!selected) {
      $('#ex-image').append(node('p', 'ex-empty', 'Nenhuma obra encontrada. Experimente outro termo ou limpe os filtros.'));
      $('#ex-title').textContent = 'Nenhuma obra encontrada';
      $('#ex-author').textContent = $('#ex-date').textContent = $('#ex-description').textContent = '';
      $('#ex-position').textContent = '0 / 0';
      syncURL(); return;
    }
    reproduce(selected, $('#ex-image'));
    // A imagem do palco é o LCP da página — prioridade alta (insight LCPDiscovery).
    $('#ex-image img')?.setAttribute('fetchpriority', 'high');
    $('#ex-title').textContent = shortTitle(selected);
    $('#ex-author').textContent = selected.autoria || 'Autoria não informada';
    $('#ex-date').textContent = selected.pais + ', ' + selected.data;
    // A descrição extensa e a citação são preservadas integralmente na ficha.
    $('#ex-description').textContent = selected.instituicao || 'Instituição não informada';
    $('#ex-source').href = selected.fonte_url || '';
    const docLayer = [[tr('País', 'Country'), selected.pais], [tr('Data', 'Date'), selected.data], [tr('Tipo de obra', 'Work type'), typeOf(selected)], [tr('Suporte', 'Medium'), selected.suporte]];
    const readLayer = [
      [tr('Recorte no atlas', 'Atlas strand'), inThesisStrand(selected) ? tr('Mármore à Margem · Brasil (1822–1922)', 'Marble at the Margin · Brazil (1822–1922)') : tr('Atlas comparativo transnacional', 'Transnational comparative atlas')],
      [tr('Classificação catalogada', 'Catalogued classification'), classificationLabel(selected.regime)],
    ];
    $('#ex-metadata').append(
      node('dt', 'ex-layer-head', tr('Camada I · Registro documental', 'Layer I · Documentary record')),
      node('dd', 'ex-layer-note', tr('Dados catalográficos e proveniência', 'Catalog data & archival provenance'))
    );
    docLayer.forEach(([label, value]) => { if (value) $('#ex-metadata').append(node('dt', '', label), node('dd', '', value)); });
    $('#ex-metadata').append(
      node('dt', 'ex-layer-head', tr('Camada II · Leitura na pesquisa', 'Layer II · Research reading')),
      node('dd', 'ex-layer-note', tr('Classificação analítica situada', 'Situated analytical classification'))
    );
    readLayer.forEach(([label, value]) => { if (value) $('#ex-metadata').append(node('dt', '', label), node('dd', '', value)); });
    $('#ex-position').textContent = (index + 1) + ' / ' + filtered.length;
    strip.querySelectorAll('.ex-thumb').forEach((button) => {
      const active = button.dataset.id === selected.id;
      button.setAttribute('aria-pressed', String(active));
      if (active) {
        // Rolagem limitada à faixa, sem deslocar a página ao mudar a obra.
        const left = button.offsetLeft - strip.offsetLeft;
        if (left < strip.scrollLeft || left + button.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = left;
      }
    });
    grid.querySelectorAll('.ex-frame').forEach((frame) => {
      frame.setAttribute('aria-pressed', String(frame.dataset.id === selected.id));
    });
    constellation.querySelectorAll('.ex-star').forEach((frame) => {
      frame.setAttribute('aria-pressed', String(frame.dataset.id === selected.id));
    });
    updateCompareButtons();
    syncURL();
  }
  function openRecord(imageOnly = false) {
    if (!selected) return;
    dialogReturnFocus = document.activeElement;
    dialog.replaceChildren();
    dialog.classList.toggle('ex-dialog-image-only', imageOnly);
    const close = node('button', 'ex-dialog-close', tr('Fechar', 'Close')); close.type = 'button'; close.addEventListener('click', closeRecord);
    const title = node('h2', '', selected.titulo); title.id = 'dialog-title';
    const layout = node('div', 'ex-dialog-layout');
    const picture = node('div', 'ex-dialog-image'); reproduce(selected, picture);
    const details = node('div', 'ex-dialog-details'); details.append(title);
    if (!imageOnly) {
      // Quick actions bar: Compare + Direct Link
      const actionBar = node('div', 'ex-record-toolbar');
      if (compare) {
        const pinned = compare.has(selected.id);
        const pinBtn = node('button', 'btn btn-ghost ex-pin-btn', pinned ? tr('Na Mesa de Montagem ✓', 'In Montage Workbench ✓') : tr('+ Fixar na Mesa de Montagem', '+ Pin to Montage Workbench'));
        pinBtn.type = 'button';
        pinBtn.setAttribute('aria-pressed', String(pinned));
        pinBtn.addEventListener('click', () => {
          const nowPinned = compare.toggle(selected.id);
          pinBtn.setAttribute('aria-pressed', String(nowPinned));
          pinBtn.textContent = nowPinned ? tr('Na Mesa de Montagem ✓', 'In Montage Workbench ✓') : tr('+ Fixar na Mesa de Montagem', '+ Pin to Montage Workbench');
        });
        actionBar.append(pinBtn);
      }
      const linkBtn = node('button', 'btn btn-ghost ex-copy-link-btn', tr('Copiar link direto', 'Copy direct link'));
      linkBtn.type = 'button';
      linkBtn.addEventListener('click', () => {
        const direct = new URL(location.href);
        direct.searchParams.set('item', selected.id);
        copyTextWithFeedback(direct.toString(), linkBtn, tr('Link copiado!', 'Link copied!'));
      });
      actionBar.append(linkBtn);
      details.append(actionBar);

      // Camada I: Registro documental
      const docSection = node('section', 'ex-layer-section ex-layer-section--doc');
      const docList = node('dl', 'ex-record');
      docList.append(
        node('dt', 'ex-layer-head', tr('Camada I · Registro documental', 'Layer I · Documentary record')),
        node('dd', 'ex-layer-note', tr('Dados catalográficos, arquivo de guarda e citação', 'Catalog data, holding institution & citation'))
      );
      for (const [label, value] of [
        [tr('Registro', 'Record ID'), selected.id],
        [tr('Autoria', 'Authorship'), selected.autoria],
        [tr('País', 'Country'), selected.pais],
        [tr('Data', 'Date'), selected.data],
        [tr('Instituição', 'Institution'), selected.instituicao],
        [tr('Suporte', 'Medium'), selected.suporte],
        [tr('Direitos', 'Rights'), selected.direitos],
        [tr('Crédito da reprodução', 'Reproduction credit'), selected.credito],
        [tr('Nota curatorial', 'Curatorial note'), selected.notas_curatoriais],
        [tr('Citação', 'Citation'), selected.citacao],
      ]) {
        if (value) docList.append(node('dt', '', label), node('dd', '', value));
      }
      docSection.append(docList);

      // Citation copy buttons (ABNT + BibTeX)
      if (selected.citacao) {
        const citeActions = node('div', 'ex-cite-actions');
        const abntBtn = node('button', 'ex-cite-btn', tr('Copiar citação (ABNT)', 'Copy citation (ABNT)'));
        abntBtn.type = 'button';
        abntBtn.addEventListener('click', () => copyTextWithFeedback(selected.citacao, abntBtn, tr('ABNT copiada!', 'ABNT copied!')));
        const bibBtn = node('button', 'ex-cite-btn', tr('Copiar BibTeX', 'Copy BibTeX'));
        bibBtn.type = 'button';
        bibBtn.addEventListener('click', () => copyTextWithFeedback(buildBibTeX(selected), bibBtn, tr('BibTeX copiado!', 'BibTeX copied!')));
        citeActions.append(abntBtn, bibBtn);
        docSection.append(citeActions);
      }
      details.append(docSection);

      // Camada II: Leitura na pesquisa
      const readSection = node('section', 'ex-layer-section ex-layer-section--reading');
      const readList = node('dl', 'ex-record');
      readList.append(
        node('dt', 'ex-layer-head', tr('Camada II · Leitura na pesquisa', 'Layer II · Research reading')),
        node('dd', 'ex-layer-note', tr('Enquadramento analítico situado no atlas Mnemosyne Viva', 'Situated analytical framing in the Mnemosyne Viva atlas'))
      );
      for (const [label, value] of [
        [tr('Recorte no atlas', 'Atlas strand'), inThesisStrand(selected) ? tr('Mármore à Margem · Brasil (1822–1922)', 'Marble at the Margin · Brazil (1822–1922)') : tr('Atlas comparativo transnacional', 'Transnational comparative atlas')],
        [tr('Classificação catalogada', 'Catalogued classification'), classificationLabel(selected.regime)],
        [tr('Descrição', 'Description'), selected.descricao],
      ]) {
        if (value) readList.append(node('dt', '', label), node('dd', '', value));
      }
      // Clickable motif chips that filter the archive
      if (selected.motivos?.length) {
        readList.append(node('dt', '', tr('Motivos (clique para filtrar)', 'Motifs (click to filter)')));
        const dd = node('dd', 'ex-chip-list');
        selected.motivos.forEach((motif) => {
          const chip = node('button', 'ex-chip ex-chip--interactive', motif);
          chip.type = 'button';
          chip.addEventListener('click', () => {
            fields.q.value = motif;
            closeRecord();
            filterItems();
          });
          dd.append(chip);
        });
        readList.append(dd);
      }
      readSection.append(readList);

      // Panofsky 3-level structured apparatus from iconographic_metadata
      const pan = selected.iconographic_metadata?.panofsky;
      if (pan && (pan.pre_iconographic?.length || pan.codes?.length || pan.interpretation?.length)) {
        const panBox = node('details', 'ex-analysis ex-panofsky');
        panBox.open = true;
        panBox.append(node('summary', '', tr('Aparato iconológico (Panofsky · 3 níveis)', 'Iconological apparatus (Panofsky · 3 levels)')));
        panBox.append(node('p', 'ex-panofsky-caveat', tr('Notas de trabalho do catálogo: distinguem motivos observáveis, notações Iconclass e hipóteses interpretativas situadas.', 'Working catalog notes: distinguishing observable motifs, Iconclass notations, and situated interpretive hypotheses.')));

        if (pan.pre_iconographic?.length) {
          panBox.append(node('h3', '', tr('Nível 1 · Pré-iconográfico (motivos observados)', 'Level 1 · Pre-iconographic (observed motifs)')));
          const preList = node('div', 'ex-chip-list');
          pan.pre_iconographic.forEach((m) => {
            if (!m?.motif) return;
            const chip = node('span', 'ex-chip', m.motif);
            preList.append(chip);
          });
          panBox.append(preList);
        }

        if (pan.codes?.length) {
          panBox.append(node('h3', '', tr('Nível 2 · Iconográfico (notações Iconclass)', 'Level 2 · Iconographic (Iconclass notations)')));
          const codeList = node('div', 'ex-chip-list');
          pan.codes.forEach((c) => {
            if (!c?.notation) return;
            const a = node('a', 'ex-chip ex-chip--code', `${c.notation}${c.label ? ' · ' + c.label : ''}`);
            a.href = 'https://iconclass.org/' + encodeURIComponent(c.notation);
            a.target = '_blank';
            a.rel = 'noopener';
            codeList.append(a);
          });
          panBox.append(codeList);
        }

        if (pan.interpretation?.length) {
          panBox.append(node('h3', '', tr('Nível 3 · Leituras situadas e contexto jurídico', 'Level 3 · Situated readings & legal context')));
          const claimsUl = node('ul', 'ex-claim-list');
          pan.interpretation.forEach((claim) => {
            if (!claim?.claim_text) return;
            const li = node('li', 'ex-claim-item');
            const meta = node('div', 'ex-claim-meta');
            meta.append(
              node('span', 'ex-claim-type', claimTypeLabel(claim.claim_type)),
              node('span', `ex-status-pill ex-status-pill--${claim.status === 'supported' ? 'supported' : 'tentative'}`, claimStatusLabel(claim.status)),
            );
            li.append(meta, node('p', 'ex-claim-text', claim.claim_text));
            claimsUl.append(li);
          });
          panBox.append(claimsUl);
        }
        readSection.append(panBox);
      }

      const analysis = publication?.approvedAnalysis(selected.analise_publica);
      if (analysis) {
        const section = node('details', 'ex-analysis');
        section.append(node('summary', '', tr('Análise iconográfica aprovada', 'Approved iconographic analysis')));
        if (analysis.summary) section.append(node('p', 'ex-analysis-summary', analysis.summary));
        for (const [label, key] of [
          [tr('Nível 1 · pré-iconográfico', 'Level 1 · pre-iconographic'), 'level_1'],
          [tr('Nível 2 · iconográfico', 'Level 2 · iconographic'), 'level_2'],
          [tr('Nível 3 · iconológico', 'Level 3 · iconological'), 'level_3'],
        ]) {
          if (typeof analysis.panofsky?.[key] === 'string') section.append(node('h3', '', label), node('p', '', analysis.panofsky[key]));
        }
        if (analysis.limitation) section.append(node('p', 'ex-analysis-limitation', analysis.limitation));
        if (analysis.method_note) section.append(node('p', 'ex-method-note', analysis.method_note));
        readSection.append(section);
      }
      details.append(readSection);
    }
    if (safeURL(selected.fonte_url)) {
      const source = node('a', 'ex-action', tr('Arquivo de origem', 'Source archive')); source.href = selected.fonte_url; source.target = '_blank'; source.rel = 'noopener'; details.append(source);
    }
    if (safeURL(selected.imagem_fonte) && selected.imagem_fonte !== selected.fonte_url) {
      const source = node('a', 'ex-action', tr('Fonte da reprodução', 'Reproduction source')); source.href = selected.imagem_fonte; source.target = '_blank'; source.rel = 'noopener'; details.append(source);
    }
    layout.append(picture, details); dialog.append(close, layout); dialog.showModal(); document.body.style.overflow = 'hidden'; close.focus();
  }
  $('.ex-prev').addEventListener('click', () => navigate(-1));
  $('.ex-next').addEventListener('click', () => navigate(1));
  stage.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); navigate(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  $('#ex-open').addEventListener('click', () => openRecord());
  $('#ex-more').addEventListener('click', () => openRecord());
  $('#ex-compare-toggle')?.addEventListener('click', () => { if (selected && compare) compare.toggle(selected.id); });
  $('.ex-expand').addEventListener('click', () => openRecord(true));
  $('.ex-filters').addEventListener('submit', (event) => { event.preventDefault(); filterItems(); });
  fields.q.addEventListener('input', debounce(filterItems, 200));
  Object.values(fields).filter((field) => field !== fields.q).forEach((field) => field.addEventListener('input', filterItems));
  $('#clear-filters').addEventListener('click', () => { Object.values(fields).forEach((field) => { field.value = ''; }); activeStrand = ''; filterItems(); });
  strandAll?.addEventListener('click', () => { activeStrand = ''; filterItems(); });
  strandTese?.addEventListener('click', () => { activeStrand = 'tese'; filterItems(); });
  $('#view-palco').addEventListener('click', () => setView('palco'));
  $('#view-grade').addEventListener('click', () => setView('grade'));
  $('#view-constelacao').addEventListener('click', () => setView('constelacao'));
  window.addEventListener('iconocracia:lang', () => {
    if (!items.length) return;
    filterItems();
    compare?.renderTray();
    if (dialog.open) openRecord(dialog.classList.contains('ex-dialog-image-only'));
  });
  // Create the recovery control here so cached HTML also works with this script.
  const retry = node('button', '', 'Tentar novamente');
  retry.id = 'retry-acervo'; retry.type = 'button'; retry.hidden = true;
  $('.ex-results-actions').prepend(retry);
  const loadControls = document.querySelectorAll('.ex-filters input, .ex-filters select, .ex-filters button, .ex-view-toggle button, .ex-strand-btn, .ex-arrow, .ex-expand, #ex-open, #ex-more, #ex-compare-toggle, #clear-filters');
  let loading = false;

  async function fetchAcervo(refresh = false) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        // A recovered server must not be hidden by a fresh cached error payload.
        const response = await fetch('data/acervo.json', { signal: controller.signal, cache: attempt || refresh ? 'reload' : 'default' });
        if (!response.ok) {
          const error = new Error('Acervo indisponível: HTTP ' + response.status);
          error.retryable = response.status >= 500 || response.status === 408 || response.status === 429;
          throw error;
        }
        const data = await response.json();
        // Validate the fields consumed by the renderer before mutating UI state.
        if (!Array.isArray(data) || !data.every((item) => item && typeof item.id === 'string' && item.id.trim() && typeof item.titulo === 'string' && typeof item.pais === 'string' && (item.motivos == null || Array.isArray(item.motivos)))) {
          throw new Error('Formato inválido do acervo');
        }
        return data;
      } catch (error) {
        const transient = controller.signal.aborted || error instanceof TypeError || error.retryable;
        if (!transient || attempt === 2) throw error;
      } finally {
        clearTimeout(timeout);
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  async function loadAcervo(refresh = false) {
    if (loading) return;
    loading = true;
    const retryFocused = document.activeElement === retry;
    const requested = new URLSearchParams(location.search);
    $('.exhibition').setAttribute('aria-busy', 'true');
    loadControls.forEach((control) => { control.disabled = true; });
    retry.hidden = true;
    $('#ex-source').hidden = true;
    $('#ex-title').textContent = 'Carregando acervo';
    $('#result-count').textContent = 'Carregando acervo…';
    let loaded = false, linkedSelection = false;
    try {
      const data = await fetchAcervo(refresh);
      const context = publication ? await publication.loadContext(data, refresh).catch(error => {
        if (requested.has('constelacao')) throw error;
        return { items: publication.publicItems(data), constellations: [] };
      }) : { items: data, constellations: [] };
      activeConstellation = context.constellations.find(entry => entry.slug === requested.get('constelacao')) || null;
      if (requested.has('constelacao') && !activeConstellation) throw new Error('Percurso indisponível na publicação atual');
      publication?.showNavigation(context.constellations);
      const contextLabel = $('#ex-curatorial-context');
      if (contextLabel) {
        contextLabel.hidden = !activeConstellation;
        contextLabel.replaceChildren();
        if (activeConstellation) {
          const link = node('a', '', activeConstellation.title);
          link.href = 'constelacoes.html?slug=' + encodeURIComponent(activeConstellation.slug);
          contextLabel.append(document.createTextNode('Percurso: '), link);
        }
      }
      const featured = ['BR-009', 'US-008', 'FR-005', 'BR-005', 'FR-008'];
      const rank = (item) => { const index = featured.indexOf(item.id); return index < 0 ? featured.length : index; };
      items = context.items.slice().sort((a, b) => rank(a) - rank(b));
      items.forEach((item) => {
        item._hay = normalize([item.id, item.titulo, item.autoria, item.pais, item.data, item.instituicao, item.suporte, ...(item.motivos || [])].join(' '));
      });
      Object.values(fields).filter((field) => field.tagName === 'SELECT').forEach((field) => {
        field.replaceChildren(field.options[0]);
      });
      fillOptions(fields.pais, items.map((item) => item.pais));
      fillClassifications(items.map((item) => item.regime));
      fillOptions(fields.periodo, items.map(centuryOf), (value) => value === 'sem-ano' ? 'Sem ano numérico' : 'Século ' + value);
      fillOptions(fields.tipo, items.map(typeOf));
      Object.entries(fields).forEach(([key, field]) => { field.value = requested.get(key) || ''; });
      activeStrand = requested.get('recorte') === 'tese' ? 'tese' : '';
      const linked = publication ? publication.resolveItem(items, requested.get('item')) : items.find(item => item.id === requested.get('item'));
      selected = linked || items[0];
      selectionLinked = !!linked;
      loadControls.forEach((control) => { control.disabled = false; });
      filterItems();
      setView(view);
      compare?.setItems(items, requested.get('comparar'));
      linkedSelection = !!linked && selected?.id === linked.id;
      loaded = true;
    } catch (error) {
      console.error('Falha ao carregar o acervo', error);
      loadControls.forEach((control) => { control.disabled = true; });
      items = []; filtered = []; selected = null; activeConstellation = null;
      if ($('#ex-curatorial-context')) $('#ex-curatorial-context').hidden = true;
      if (strandContext) { strandContext.hidden = true; strandContext.replaceChildren(); }
      // Do not call renderSelected: its empty-search path rewrites the URL.
      stage.hidden = false;
      document.querySelector('.ex-layout').classList.remove('ex-layout-wide');
      document.body.classList.remove('ex-ground-full');
      strip.hidden = grid.hidden = constellation.hidden = true;
      strip.replaceChildren(); grid.replaceChildren(); constellation.replaceChildren();
      $('#ex-image').textContent = requested.has('constelacao') ? 'Este percurso não está disponível na publicação atual.' : 'Não foi possível carregar os registros. Tente novamente.';
      $('#ex-title').textContent = requested.has('constelacao') ? 'Percurso indisponível' : 'Acervo indisponível';
      $('#ex-author').textContent = $('#ex-date').textContent = $('#ex-description').textContent = '';
      $('#ex-metadata').replaceChildren();
      $('#ex-position').textContent = '—';
      $('#result-count').textContent = requested.has('constelacao') ? 'Percurso indisponível' : 'Falha ao carregar o acervo';
      $('#clear-filters').hidden = true;
      retry.hidden = false;
    } finally {
      loading = false;
      $('.exhibition').setAttribute('aria-busy', 'false');
      if (loaded && (requested.has('buscar') || retryFocused)) fields.q.focus();
      else if (loaded && linkedSelection && view === 'constelacao') {
        const frame = selectedFrame();
        if (frame) {
          focusFrame(frame);
          openRecord();
        }
      }
    }
  }
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => {
      const width = Math.round(constellation.clientWidth), small = matchMedia('(max-width:700px)').matches;
      if (loading || !width || view !== 'constelacao' || (width === constellationWidth && small === constellationSmall)) return;
      const focused = document.activeElement?.classList.contains('ex-star') ? document.activeElement.dataset.id : null;
      renderConstellation();
      if (focused && !dialog.open) focusFrame([...constellation.querySelectorAll('.ex-star')].find(frame => frame.dataset.id === focused));
    }).observe(constellation);
  }
  retry.addEventListener('click', () => loadAcervo(true));
  loadAcervo();
})();
