/* ICONOCRACIA — Mesa de Montagem (Warburgian side-by-side comparative workbench). */
(() => {
  'use strict';

  const MAX_ITEMS = 3;

  function parseCompareParam(raw) {
    if (!raw || typeof raw !== 'string') return [];
    const seen = new Set();
    const out = [];
    for (const part of raw.split(',')) {
      const id = part.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      if (out.length >= MAX_ITEMS) break;
    }
    return out;
  }

  function sharedMotifs(items) {
    if (!Array.isArray(items) || items.length < 2) return new Set();
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const counts = new Map();
    for (const item of items) {
      const unique = new Set((item.motivos || []).map(norm).filter(Boolean));
      for (const m of unique) counts.set(m, (counts.get(m) || 0) + 1);
    }
    const shared = new Set();
    for (const [m, n] of counts.entries()) {
      if (n >= 2) shared.add(m);
    }
    return shared;
  }

  function buildCompareURL(ids, baseHref) {
    const url = new URL(baseHref || (typeof location !== 'undefined' ? location.href : 'https://iconocracia.com/acervo'));
    if (ids.length) url.searchParams.set('comparar', ids.join(','));
    else url.searchParams.delete('comparar');
    return url.toString();
  }

  function createWorkbench(options = {}) {
    const isEn = () => typeof document !== 'undefined' && document.documentElement?.getAttribute('data-lang') === 'en';
    const tr = (pt, en) => (isEn() ? en : pt);
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const node = (tag, className, text) => {
      const el = document.createElement(tag);
      if (className) el.className = className;
      if (text !== undefined) el.textContent = text;
      return el;
    };

    const resolveItem = options.resolveItem || ((all, id) => all.find((x) => x.id === id));
    const imageSource = options.imageSource || ((item) => 'assets/acervo/' + encodeURIComponent(item.id) + '.webp');
    const classificationLabel = options.classificationLabel || ((v) => v || '—');
    const inThesisStrand = options.inThesisStrand || (() => false);
    const onOpenSingle = options.onOpenSingle || (() => {});
    const onChange = options.onChange || (() => {});

    let allItems = [];
    let pinnedIds = [];
    let trayEl = null;
    let dialogEl = null;

    function resolvePinned() {
      return pinnedIds.map((id) => resolveItem(allItems, id)).filter(Boolean);
    }

    function syncCompareQuery() {
      if (typeof history === 'undefined' || typeof location === 'undefined') return;
      const url = new URL(location.href);
      if (pinnedIds.length) url.searchParams.set('comparar', pinnedIds.join(','));
      else url.searchParams.delete('comparar');
      history.replaceState(null, '', url);
    }

    function setItems(items, initialParam) {
      allItems = Array.isArray(items) ? items : [];
      if (initialParam) {
        const requested = parseCompareParam(initialParam);
        pinnedIds = requested.map((id) => resolveItem(allItems, id)?.id).filter(Boolean);
      } else {
        pinnedIds = pinnedIds.filter((id) => !!resolveItem(allItems, id));
      }
      renderTray();
      onChange(pinnedIds.slice());
      if (initialParam && pinnedIds.length >= 2) openDialog();
    }

    function has(id) {
      return pinnedIds.includes(id);
    }

    function toggle(id) {
      if (!id) return false;
      if (has(id)) {
        pinnedIds = pinnedIds.filter((x) => x !== id);
      } else {
        if (pinnedIds.length >= MAX_ITEMS) pinnedIds = pinnedIds.slice(1);
        pinnedIds.push(id);
      }
      syncCompareQuery();
      renderTray();
      onChange(pinnedIds.slice());
      return has(id);
    }

    function clear() {
      pinnedIds = [];
      syncCompareQuery();
      renderTray();
      onChange([]);
      if (dialogEl?.open) dialogEl.close();
    }

    function ensureDialog() {
      if (dialogEl) return dialogEl;
      dialogEl = node('dialog', 'ex-dialog ex-compare-dialog');
      dialogEl.setAttribute('aria-labelledby', 'compare-dialog-title');
      dialogEl.addEventListener('click', (event) => {
        if (event.target === dialogEl) dialogEl.close();
      });
      dialogEl.addEventListener('close', () => {
        document.body.style.overflow = '';
      });
      document.body.append(dialogEl);
      return dialogEl;
    }

    function copyShareLink(button) {
      const shareUrl = buildCompareURL(pinnedIds);
      const done = () => {
        const orig = button.textContent;
        button.textContent = tr('Link copiado!', 'Link copied!');
        setTimeout(() => { button.textContent = orig; }, 1800);
      };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareUrl).then(done).catch(done);
      } else {
        done();
      }
    }

    function openDialog() {
      const items = resolvePinned();
      if (!items.length) return;
      const dlg = ensureDialog();
      dlg.replaceChildren();

      const header = node('div', 'ex-compare-header');
      const headingWrap = node('div', 'ex-compare-heading');
      headingWrap.append(
        node('p', 'ex-overline', tr('MESA DE MONTAGEM · PRANCHA COMPARATIVA', 'MONTAGE WORKBENCH · COMPARATIVE PLATE')),
      );
      const h2 = node('h2', '', tr('Comparação lado a lado', 'Side-by-side comparison'));
      h2.id = 'compare-dialog-title';
      headingWrap.append(h2);

      const actions = node('div', 'ex-compare-header-actions');
      const copyBtn = node('button', 'btn btn-ghost ex-compare-copy', tr('Copiar link da montagem', 'Copy montage link'));
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', () => copyShareLink(copyBtn));
      const closeBtn = node('button', 'ex-dialog-close', tr('Fechar', 'Close'));
      closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => dlg.close());
      actions.append(copyBtn, closeBtn);
      header.append(headingWrap, actions);

      const note = node(
        'p',
        'ex-method-note ex-compare-note',
        tr(
          'A aproximação lado a lado permite ler intervalos, deslocamentos e coexistências entre suportes. Semelhança visual não estabelece transmissão histórica direta.',
          'Side-by-side juxtaposition enables reading intervals, shifts, and coexistences across media. Visual resemblance alone does not establish direct historical transmission.',
        ),
      );

      const shared = sharedMotifs(items);
      const cols = node('div', `ex-compare-grid ex-compare-grid--${items.length}`);

      items.forEach((item) => {
        const col = node('article', 'ex-compare-col');

        const fig = node('figure', 'ex-compare-figure');
        if (item.tem_imagem) {
          const img = node('img');
          img.src = imageSource(item);
          img.alt = item.texto_alternativo || item.titulo;
          img.decoding = 'async';
          fig.append(img);
        } else {
          fig.append(node('span', 'ex-missing', tr('Sem reprodução disponível.', 'No reproduction available.')));
        }
        const cap = node('figcaption', 'ex-compare-cap');
        cap.append(
          node('span', 'ex-compare-id', item.id),
          node('strong', '', item.titulo),
        );
        fig.append(cap);
        col.append(fig);

        const meta = node('dl', 'ex-compare-dl');
        const rows = [
          [tr('País e data', 'Country & date'), [item.pais, item.data].filter(Boolean).join(', ')],
          [tr('Suporte', 'Medium'), item.suporte || '—'],
          [tr('Recorte', 'Strand'), inThesisStrand(item) ? tr('Mármore à Margem (1822–1922)', 'Mármore à Margem (1822–1922)') : tr('Atlas comparativo', 'Comparative atlas')],
          [tr('Classificação catalogada', 'Catalogued classification'), classificationLabel(item.regime)],
        ];
        for (const [k, v] of rows) {
          meta.append(node('dt', '', k), node('dd', '', v));
        }

        // Motifs with shared highlighting
        if (item.motivos?.length) {
          meta.append(node('dt', '', tr('Motivos', 'Motifs')));
          const dd = node('dd', 'ex-chip-list');
          item.motivos.forEach((m) => {
            const isShared = shared.has(norm(m));
            const chip = node('span', isShared ? 'ex-chip ex-chip--shared' : 'ex-chip', m);
            if (isShared) chip.title = tr('Motivo compartilhado nesta montagem', 'Shared motif in this montage');
            dd.append(chip);
          });
          meta.append(dd);
        }

        // Iconclass codes if available
        const codes = item.iconographic_metadata?.panofsky?.codes || [];
        if (codes.length) {
          meta.append(node('dt', '', 'Iconclass'));
          const dd = node('dd', 'ex-chip-list');
          codes.forEach((c) => {
            if (!c.notation) return;
            const link = node('a', 'ex-chip ex-chip--code', c.notation);
            link.href = 'https://iconclass.org/' + encodeURIComponent(c.notation);
            link.target = '_blank';
            link.rel = 'noopener';
            dd.append(link);
          });
          meta.append(dd);
        }

        // Legal context & postcolonial claims
        const claims = (item.iconographic_metadata?.panofsky?.interpretation || []).filter(
          (c) => c.claim_type === 'legal_context' || c.claim_type === 'postcolonial_marker',
        );
        if (claims.length) {
          meta.append(node('dt', '', tr('Leituras situadas (Camada II)', 'Situated readings (Layer II)')));
          const dd = node('dd', 'ex-compare-claims');
          claims.slice(0, 2).forEach((c) => {
            const p = node('p', 'ex-compare-claim', c.claim_text);
            dd.append(p);
          });
          meta.append(dd);
        }

        col.append(meta);

        const colActions = node('div', 'ex-compare-col-actions');
        const openBtn = node('button', 'btn btn-ghost', tr('Abrir ficha completa', 'Open full record'));
        openBtn.type = 'button';
        openBtn.addEventListener('click', () => {
          dlg.close();
          onOpenSingle(item);
        });
        const removeBtn = node('button', 'ex-compare-remove', tr('Retirar', 'Remove'));
        removeBtn.type = 'button';
        removeBtn.addEventListener('click', () => {
          toggle(item.id);
          if (pinnedIds.length) openDialog();
          else dlg.close();
        });
        colActions.append(openBtn, removeBtn);
        col.append(colActions);
        cols.append(col);
      });

      dlg.append(header, note, cols);
      if (!dlg.open) {
        dlg.showModal();
        document.body.style.overflow = 'hidden';
      }
      closeBtn.focus();
    }

    function renderTray() {
      if (!trayEl) trayEl = document.getElementById('ex-compare-tray');
      if (!trayEl) return;
      const items = resolvePinned();
      trayEl.hidden = items.length === 0;
      trayEl.replaceChildren();
      if (!items.length) return;

      const inner = node('div', 'ex-compare-tray-inner');
      const info = node('div', 'ex-compare-tray-info');
      info.append(
        node('span', 'ex-compare-tray-label', tr('Mesa de Montagem', 'Montage Workbench')),
        node('span', 'ex-compare-tray-count', `${items.length}/${MAX_ITEMS}`),
      );

      const thumbs = node('div', 'ex-compare-tray-thumbs');
      items.forEach((item) => {
        const pill = node('div', 'ex-compare-pill');
        if (item.tem_imagem) {
          const img = node('img');
          img.src = imageSource(item);
          img.alt = '';
          img.width = 36;
          img.height = 36;
          pill.append(img);
        }
        pill.append(node('span', 'ex-compare-pill-id', item.id));
        const rm = node('button', 'ex-compare-pill-rm', '×');
        rm.type = 'button';
        rm.setAttribute('aria-label', tr(`Remover ${item.id} da montagem`, `Remove ${item.id} from montage`));
        rm.addEventListener('click', () => toggle(item.id));
        pill.append(rm);
        thumbs.append(pill);
      });

      const controls = node('div', 'ex-compare-tray-actions');
      const compareBtn = node(
        'button',
        'btn btn-primary ex-compare-launch',
        items.length < 2
          ? tr('Selecione +1 obra', 'Pin +1 work')
          : tr('Comparar prancha', 'Compare plate'),
      );
      compareBtn.type = 'button';
      compareBtn.disabled = items.length < 2;
      compareBtn.addEventListener('click', openDialog);

      const clearBtn = node('button', 'btn btn-ghost ex-compare-clear', tr('Limpar', 'Clear'));
      clearBtn.type = 'button';
      clearBtn.addEventListener('click', clear);

      controls.append(compareBtn, clearBtn);
      inner.append(info, thumbs, controls);
      trayEl.append(inner);
    }

    return {
      setItems,
      has,
      toggle,
      clear,
      list: () => pinnedIds.slice(),
      openDialog,
      renderTray,
    };
  }

  const api = {
    MAX_ITEMS,
    parseCompareParam,
    sharedMotifs,
    buildCompareURL,
    createWorkbench,
  };

  if (typeof window !== 'undefined') window.IconocraciaCompare = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
