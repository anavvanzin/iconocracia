/* ICONOCRACIA — exposição, filtros e fichas do recorte publicado. */
(() => {
  'use strict';
  const publication = window.IconocraciaPublication;
  const $ = (selector) => document.querySelector(selector);
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const safeURL = (value) => /^https?:\/\//i.test(value || '');
  const shortTitle = (item) => item.titulo.replace(/\s*\([^)]*\)\s*$/, '');
  const yearOf = (item) => Number(String(item.data).match(/\b\d{4}\b/)?.[0]) || null;
  const centuryOf = (item) => { const year = yearOf(item); return year ? String(Math.floor((year - 1) / 100) + 1) : 'sem-ano'; };
  // Agrupamento de navegação derivado do suporte; o valor original permanece na ficha.
  function typeOf(item) {
    const support = normalize(item.suporte);
    if (/photograph|photogra|albumen|salted paper/.test(support)) return 'Fotografia';
    if (/sculpture|relief|bust/.test(support)) return 'Escultura';
    if (/poster|affiche|cartaz/.test(support)) return 'Cartaz';
    if (/oil|painting|pintura|decorative panel/.test(support)) return 'Pintura';
    if (/coin|money/.test(support)) return 'Moeda e cédula';
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
      container.append(node('span', 'ex-missing', 'Sem reprodução disponível — consulte o arquivo de origem.'));
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
      const imageURL = publication ? publication.imageURL(item.imagem) : (safeURL(item.imagem) ? item.imagem : null);
      if (!fallback && imageURL && imageURL !== img.getAttribute('src')) { fallback = true; img.src = imageURL; }
      else container.replaceChildren(node('span', 'ex-missing', 'Reprodução indisponível — consulte o arquivo de origem.'));
    });
    container.append(img);
  }
  const searchShortcut = $('.ex-search-shortcut');
  searchShortcut?.addEventListener('click', () => {
    if ($('#q')) $('#q').focus(); else location.href = 'acervo.html?buscar=1';
  });
  if ($('[data-stat]')) {
    fetch('data/stats.json').then((response) => response.json()).then((stats) => {
      document.querySelectorAll('[data-stat]').forEach((el) => {
        el.textContent = el.dataset.stat === 'periodo' ? stats.periodo.min + '–' + stats.periodo.max : stats[el.dataset.stat];
      });
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
  function syncURL() {
    const url = new URL(location.href);
    for (const [key, el] of Object.entries(fields)) {
      if (el.value) url.searchParams.set(key, el.value); else url.searchParams.delete(key);
    }
    if (selected && (view !== 'constelacao' || selectionLinked)) url.searchParams.set('item', selected.id); else url.searchParams.delete('item');
    url.searchParams.set('visao', view);
    if (activeConstellation) url.searchParams.set('constelacao', activeConstellation.slug);
    url.searchParams.delete('buscar');
    history.replaceState(null, '', url);
  }
  function filterItems() {
    const scoped = activeConstellation ? activeConstellation.item_ids.map(id => items.find(item => item.id === id)) : items;
    filtered = scoped.filter((item) => {
      if (fields.pais.value && fields.pais.value !== item.pais) return false;
      if (fields.regime.value && fields.regime.value !== item.regime) return false;
      if (fields.periodo.value && fields.periodo.value !== centuryOf(item)) return false;
      if (fields.tipo.value && fields.tipo.value !== typeOf(item)) return false;
      const haystack = normalize([item.id, item.titulo, item.autoria, item.pais, item.data, item.instituicao, item.suporte, ...(item.motivos || [])].join(' '));
      return !fields.q.value || haystack.includes(normalize(fields.q.value));
    });
    const previousId = selected?.id;
    selected = filtered.find((item) => item.id === previousId) || filtered[0] || null;
    if (view === 'constelacao' && selected?.id !== previousId) selectionLinked = false;
    $('#result-count').textContent = activeConstellation
      ? filtered.length + ' de ' + scoped.length + ' obras · ' + activeConstellation.title
      : filtered.length + ' de ' + items.length + ' registros · recorte do acervo';
    $('#clear-filters').hidden = !Object.values(fields).some((el) => el.value);
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
  function renderSelected() {
    const index = filtered.indexOf(selected);
    $('.ex-prev').disabled = index <= 0;
    $('.ex-next').disabled = index < 0 || index >= filtered.length - 1;
    $('#ex-open').disabled = !selected;
    $('#ex-more').disabled = !selected;
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
    const metadata = [['País', selected.pais], ['Regime', selected.regime], ['Data', selected.data], ['Tipo de obra', typeOf(selected)], ['Suporte', selected.suporte]];
    metadata.forEach(([label, value]) => { if (value) $('#ex-metadata').append(node('dt', '', label), node('dd', '', value)); });
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
    syncURL();
  }
  function openRecord(imageOnly = false) {
    if (!selected) return;
    dialogReturnFocus = document.activeElement;
    dialog.replaceChildren();
    dialog.classList.toggle('ex-dialog-image-only', imageOnly);
    const close = node('button', 'ex-dialog-close', 'Fechar'); close.type = 'button'; close.addEventListener('click', closeRecord);
    const title = node('h2', '', selected.titulo); title.id = 'dialog-title';
    const layout = node('div', 'ex-dialog-layout');
    const picture = node('div', 'ex-dialog-image'); reproduce(selected, picture);
    const details = node('div', 'ex-dialog-details'); details.append(title);
    if (!imageOnly) {
      const list = node('dl', 'ex-record');
      for (const [label, value] of [['Registro', selected.id], ['Autoria', selected.autoria], ['País', selected.pais], ['Data', selected.data], ['Instituição', selected.instituicao], ['Regime', selected.regime], ['Suporte', selected.suporte], ['Motivos', (selected.motivos || []).join(', ')], ['Descrição', selected.descricao], ['Direitos', selected.direitos], ['Crédito da reprodução', selected.credito], ['Citação', selected.citacao]]) {
        if (value) list.append(node('dt', '', label), node('dd', '', value));
      }
      details.append(list);
      const analysis = publication?.approvedAnalysis(selected.analise_publica);
      if (analysis) {
        const section = node('details', 'ex-analysis');
        section.append(node('summary', '', 'Análise iconográfica'));
        if (analysis.summary) section.append(node('p', 'ex-analysis-summary', analysis.summary));
        for (const [label, key] of [['Nível 1 · pré-iconográfico', 'level_1'], ['Nível 2 · iconográfico', 'level_2'], ['Nível 3 · iconológico', 'level_3']]) {
          if (typeof analysis.panofsky?.[key] === 'string') section.append(node('h3', '', label), node('p', '', analysis.panofsky[key]));
        }
        if (analysis.limitation) section.append(node('p', 'ex-analysis-limitation', analysis.limitation));
        if (analysis.method_note) section.append(node('p', 'ex-method-note', analysis.method_note));
        details.append(section);
      }
    }
    if (safeURL(selected.fonte_url)) {
      const source = node('a', 'ex-action', 'Arquivo de origem'); source.href = selected.fonte_url; source.target = '_blank'; source.rel = 'noopener'; details.append(source);
    }
    if (safeURL(selected.imagem_fonte) && selected.imagem_fonte !== selected.fonte_url) {
      const source = node('a', 'ex-action', 'Fonte da reprodução'); source.href = selected.imagem_fonte; source.target = '_blank'; source.rel = 'noopener'; details.append(source);
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
  $('.ex-expand').addEventListener('click', () => openRecord(true));
  $('.ex-filters').addEventListener('submit', (event) => { event.preventDefault(); filterItems(); });
  Object.values(fields).forEach((field) => field.addEventListener('input', filterItems));
  $('#clear-filters').addEventListener('click', () => { Object.values(fields).forEach((field) => { field.value = ''; }); filterItems(); });
  $('#view-palco').addEventListener('click', () => setView('palco'));
  $('#view-grade').addEventListener('click', () => setView('grade'));
  $('#view-constelacao').addEventListener('click', () => setView('constelacao'));
  // Create the recovery control here so cached HTML also works with this script.
  const retry = node('button', '', 'Tentar novamente');
  retry.id = 'retry-acervo'; retry.type = 'button'; retry.hidden = true;
  $('.ex-results-actions').prepend(retry);
  const loadControls = document.querySelectorAll('.ex-filters input, .ex-filters select, .ex-filters button, .ex-view-toggle button, .ex-arrow, .ex-expand, #ex-open, #ex-more, #clear-filters');
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
      Object.values(fields).filter((field) => field.tagName === 'SELECT').forEach((field) => {
        field.replaceChildren(field.options[0]);
      });
      fillOptions(fields.pais, items.map((item) => item.pais));
      fillOptions(fields.regime, items.map((item) => item.regime));
      fillOptions(fields.periodo, items.map(centuryOf), (value) => value === 'sem-ano' ? 'Sem ano numérico' : 'Século ' + value);
      fillOptions(fields.tipo, items.map(typeOf));
      Object.entries(fields).forEach(([key, field]) => { field.value = requested.get(key) || ''; });
      const linked = publication ? publication.resolveItem(items, requested.get('item')) : items.find(item => item.id === requested.get('item'));
      selected = linked || items[0];
      selectionLinked = !!linked;
      loadControls.forEach((control) => { control.disabled = false; });
      filterItems();
      setView(view);
      linkedSelection = !!linked && selected?.id === linked.id;
      loaded = true;
    } catch (error) {
      console.error('Falha ao carregar o acervo', error);
      loadControls.forEach((control) => { control.disabled = true; });
      items = []; filtered = []; selected = null; activeConstellation = null;
      if ($('#ex-curatorial-context')) $('#ex-curatorial-context').hidden = true;
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
