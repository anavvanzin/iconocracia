/* ICONOCRACIA — percursos curatoriais publicados e metadados editoriais. */
(() => {
  'use strict';
  const nonempty = value => typeof value === 'string' && value.trim().length > 0;
  const publicationAllowed = value => ['status', 'editorial_status', 'publication_status'].every(key => value?.[key] == null || ['published', 'approved'].includes(value[key]));
  const approvedAnalysis = value => value && typeof value === 'object' && value.status === 'approved' && publicationAllowed(value) ? value : null;
  const overlayImages = new WeakMap();
  function sourceURL(value) {
    if (!nonempty(value) || !/^https?:\/\/[^\\\s]+$/i.test(value)) return null;
    try {
      const url = new URL(value);
      return url.hostname && !url.username && !url.password ? value : null;
    } catch { return null; }
  }
  function imageURL(value) {
    if (!nonempty(value)) return null;
    if (sourceURL(value)) return value;
    let decoded;
    try { decoded = decodeURIComponent(value); } catch { return null; }
    if (!/^(?:[a-z0-9._~-]+\/)*[a-z0-9._~-]+\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(decoded)
      || decoded.split('/').some(part => part === '.' || part === '..')) return null;
    return value;
  }
  const imageSource = item => overlayImages.get(item) || 'assets/acervo/' + encodeURIComponent(item.id) + '.webp';

  function publicItems(items, overlay) {
    const entries = overlay?.version === 1 && Array.isArray(overlay.items) ? overlay.items : [];
    const overlays = new Map();
    const duplicate = new Set();
    entries.forEach(entry => {
      if (!entry || !nonempty(entry.id)) return;
      if (overlays.has(entry.id)) duplicate.add(entry.id);
      overlays.set(entry.id, entry);
    });
    return items.filter(publicationAllowed).map(item => {
      const result = { ...item };
      const candidate = !duplicate.has(item.id) && overlays.get(item.id);
      const extra = candidate && publicationAllowed(candidate) ? candidate : null;
      if (extra) {
        for (const key of ['credito', 'texto_alternativo', 'direitos']) {
          if (nonempty(extra[key])) result[key] = extra[key];
        }
        for (const key of ['fonte_url', 'imagem_fonte']) {
          if (sourceURL(extra[key])) result[key] = extra[key];
        }
        const image = imageURL(extra.imagem);
        if (image) { result.imagem = image; overlayImages.set(result, image); }
        if (typeof extra.tem_imagem === 'boolean') result.tem_imagem = extra.tem_imagem;
        if (nonempty(extra.slug) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(extra.slug)) result.slug = extra.slug;
        if (Array.isArray(extra.constelacoes) && extra.constelacoes.every(slug => nonempty(slug) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) result.constelacoes = extra.constelacoes.slice();
        if (Array.isArray(extra.legacy_ids)) result.legacy_ids = extra.legacy_ids.filter(nonempty);
      }
      const analysis = approvedAnalysis(extra?.analise_publica) || approvedAnalysis(item.analise_publica);
      if (analysis) result.analise_publica = analysis;
      else delete result.analise_publica;
      return result;
    });
  }

  function resolveItem(items, requested) {
    const canonical = items.find(item => item.id === requested);
    if (canonical) return canonical;
    const matches = items.filter(item => Array.isArray(item.legacy_ids) && item.legacy_ids.includes(requested));
    return matches.length === 1 ? matches[0] : null;
  }

  function publishedConstellations(definitions, items) {
    if (!Array.isArray(definitions)) return [];
    const ids = new Set(items.map(item => item.id));
    const counts = new Map();
    definitions.forEach(entry => { if (entry) counts.set(entry.slug, (counts.get(entry.slug) || 0) + 1); });
    return definitions.filter(entry => entry && entry.editorial_status === 'published' && publicationAllowed(entry)
      && nonempty(entry.slug) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)
      && counts.get(entry.slug) === 1 && nonempty(entry.title)
      && Array.isArray(entry.item_ids) && entry.item_ids.length > 0
      && new Set(entry.item_ids).size === entry.item_ids.length
      && entry.item_ids.every(id => nonempty(id) && ids.has(id)));
  }

  const workLink = (item, slug) => `acervo.html?item=${encodeURIComponent(item.id)}&constelacao=${encodeURIComponent(slug)}`;
  async function fetchJSON(path, fallback, refresh = false) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(path, { signal: controller.signal, cache: refresh ? 'reload' : 'default' });
      if (response.status === 404 && fallback !== undefined) return fallback;
      if (!response.ok) throw new Error('Publicação indisponível: HTTP ' + response.status);
      return await response.json();
    } finally { clearTimeout(timeout); }
  }
  async function loadContext(data, refresh = false) {
    const [overlay, definitions] = await Promise.all([
      fetchJSON('data/publication-overlay.json', { version: 1, items: [] }, refresh).catch(() => ({ version: 1, items: [] })),
      fetchJSON('data/constellations.json', [], refresh),
    ]);
    const items = publicItems(data, overlay);
    return { items, constellations: publishedConstellations(definitions, items) };
  }
  function showNavigation(constellations) {
    document.querySelectorAll('[data-constellations-link], [data-constellation-cta]').forEach(link => { link.hidden = !constellations.length; });
  }
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  function imageFor(item, lazy) {
    const frame = node('div', 'constellation-image');
    if (!item.tem_imagem) {
      frame.append(node('p', 'ex-missing', 'Sem reprodução disponível — consulte o arquivo de origem.'));
      return frame;
    }
    const image = node('img');
    image.src = imageSource(item);
    image.alt = item.texto_alternativo || item.titulo;
    image.loading = lazy ? 'lazy' : 'eager'; image.decoding = 'async';
    let fallback = false;
    image.addEventListener('error', () => {
      if (image.parentNode !== frame) return;
      const url = imageURL(item.imagem);
      if (!fallback && url && url !== image.getAttribute('src')) { fallback = true; image.src = url; }
      else frame.replaceChildren(node('p', 'ex-missing', 'Reprodução indisponível — consulte o arquivo de origem.'));
    });
    frame.append(image);
    return frame;
  }

  window.IconocraciaPublication = { approvedAnalysis, publicItems, resolveItem, publishedConstellations, workLink, imageURL, imageSource, loadContext, showNavigation };
  const intro = document.querySelector('#constellation-intro');
  if (!intro) return;
  const list = document.querySelector('#constellation-items');
  const switcher = document.querySelector('#constellation-switcher');
  const requested = new URLSearchParams(location.search).get('slug');
  const state = (title, message) => {
    list.replaceChildren(); switcher.replaceChildren();
    intro.replaceChildren(node('p', 'eyebrow', 'Constelações'), node('h1', '', title), node('p', '', message));
  };
  fetchJSON('data/acervo.json').then(data => {
    if (!Array.isArray(data) || !data.every(item => item && nonempty(item.id) && typeof item.titulo === 'string' && typeof item.pais === 'string')) throw new Error('Acervo inválido');
    return loadContext(data);
  }).then(({ items, constellations }) => {
    showNavigation(constellations);
    const definition = requested ? constellations.find(entry => entry.slug === requested) : constellations[0];
    if (!definition) {
      if (requested) state('Percurso indisponível', 'Este percurso não está disponível na publicação atual.');
      else state('Nenhum percurso publicado', 'As lentes curatoriais aparecem aqui depois da revisão autoral e documental.');
      return;
    }
    document.title = `${definition.title} — Iconocracia`;
    intro.replaceChildren(node('p', 'eyebrow', 'Constelação curatorial'), node('h1', '', definition.title), node('p', 'constellation-period', definition.subtitle || ''), node('p', 'constellation-deck', definition.introduction || ''));
    const byId = new Map(items.map(item => [item.id, item]));
    definition.item_ids.forEach((id, index) => {
      const item = byId.get(id);
      const li = node('li', 'constellation-work');
      const link = node('a'); link.href = workLink(item, definition.slug);
      const figure = node('figure');
      const caption = node('figcaption');
      caption.append(node('span', 'constellation-number', String(index + 1).padStart(2, '0')), node('h2', '', item.titulo), node('p', 'constellation-meta', `${item.pais} · ${item.data}`));
      const analysis = approvedAnalysis(item.analise_publica);
      if (analysis?.summary || item.descricao) caption.append(node('p', '', analysis?.summary || item.descricao));
      caption.append(node('span', 'constellation-open', 'Abrir ficha →'));
      figure.append(imageFor(item, index >= 2), caption); link.append(figure); li.append(link); list.append(li);
    });
    const current = constellations.indexOf(definition);
    for (const [entry, prefix, suffix] of [[constellations[current - 1], '← ', ''], [constellations[current + 1], '', ' →']]) {
      if (!entry) continue;
      const link = node('a', '', prefix + entry.title + suffix); link.href = `constelacoes.html?slug=${encodeURIComponent(entry.slug)}`; switcher.append(link);
    }
  }).catch(() => state('Percurso indisponível', 'Não foi possível carregar as constelações. Recarregue a página para tentar novamente.'));
})();
