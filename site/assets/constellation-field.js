/* ICONOCRACIA — campo constelacional arquivístico do início.
   Modo noite (persistido) + parallax de ponteiro + deriva de rolagem
   do campo perspectivado. Sem transformes sob prefers-reduced-motion,
   sem 3D abaixo de 768px (aí o campo é uma grelha estática). */
(() => {
  'use strict';
  const MODE_KEY = 'iconocracia-modo';
  const root = document.documentElement;
  const toggle = document.getElementById('night-toggle');

  /* ── modo noite ──
     O estado inicial já foi decidido no <head>; aqui só se confirma
     o rótulo do botão e se lida com o clique. */
  function applyMode(nightMode) {
    if (nightMode) root.setAttribute('data-theme', 'noite');
    else root.removeAttribute('data-theme');
    if (toggle) {
      toggle.textContent = nightMode ? 'DIA' : 'NOITE';
      toggle.setAttribute('aria-pressed', String(nightMode));
    }
  }
  const stored = (() => {
    try { return localStorage.getItem(MODE_KEY); } catch { return null; }
  })();
  applyMode(stored === 'noite' || (stored !== 'dia' && matchMedia('(prefers-color-scheme: dark)').matches));
  if (toggle) toggle.addEventListener('click', () => {
    const nightMode = root.getAttribute('data-theme') !== 'noite';
    applyMode(nightMode);
    try { localStorage.setItem(MODE_KEY, nightMode ? 'noite' : 'dia'); } catch { /* sem armazenamento */ }
  });

  /* ── campo constelacional ── */
  const stage = document.querySelector('.home-constellation');
  const field = document.querySelector('.const-field');
  if (!stage || !field) return;

  const stillMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen = matchMedia('(max-width: 768px)');
  const motionOK = () => !stillMotion.matches && !smallScreen.matches;
  const resetTransforms = () => { ['--prx', '--pry', '--srx', '--sry'].forEach(name => field.style.setProperty(name, '0deg')); };
  let settling = false; // loop de rAF em andamento

  // Deriva de rolagem: progresso do herói mapeia num leve balanço do campo.
  let scrollQueued = 0;
  function scrollDrift() {
    if (!motionOK()) { field.style.setProperty('--srx', '0deg'); field.style.setProperty('--sry', '0deg'); return; }
    const rect = stage.getBoundingClientRect();
    const view = window.innerHeight || 1;
    const progress = Math.min(1, Math.max(0, (view - rect.top) / (view + rect.height)));
    field.style.setProperty('--srx', ((0.5 - progress) * 2.6).toFixed(3) + 'deg');
    field.style.setProperty('--sry', ((progress - 0.5) * 2.6).toFixed(3) + 'deg');
  }
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = requestAnimationFrame(() => { scrollQueued = 0; scrollDrift(); });
  }, { passive: true });

  // Parallax de ponteiro: alvo suavizado num único loop de rAF.
  const pointer = { x: 0, y: 0, inside: false };
  const current = { x: 0, y: 0 };
  function tick() {
    settling = false;
    const targetX = pointer.inside ? pointer.y * 2.4 : 0; // rotateX
    const targetY = pointer.inside ? pointer.x * 3.2 : 0; // rotateY
    current.x += (targetX - current.x) * 0.085;
    current.y += (targetY - current.y) * 0.085;
    field.style.setProperty('--prx', current.x.toFixed(3) + 'deg');
    field.style.setProperty('--pry', current.y.toFixed(3) + 'deg');
    if (Math.abs(targetX - current.x) > 0.01 || Math.abs(targetY - current.y) > 0.01) {
      settling = true;
      requestAnimationFrame(tick);
    }
  }
  function wake() {
    if (!settling && motionOK()) { settling = true; requestAnimationFrame(tick); }
  }
  stage.addEventListener('pointermove', (event) => {
    if (!motionOK() || event.pointerType === 'touch') return;
    const rect = stage.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    pointer.inside = true;
    wake();
  });
  stage.addEventListener('pointerleave', () => { pointer.inside = false; wake(); });

  // Prefências podem mudar no meio da visita: congelar ou retomar com coerência.
  function onEnvironmentChange() {
    pointer.inside = false;
    current.x = current.y = 0;
    if ('cancelAnimationFrame' in window && scrollQueued) cancelAnimationFrame(scrollQueued);
    scrollQueued = 0;
    resetTransforms();
    if (motionOK()) scrollDrift();
  }
  stillMotion.addEventListener?.('change', onEnvironmentChange);
  smallScreen.addEventListener?.('change', onEnvironmentChange);
  if (motionOK()) scrollDrift(); // âncoras podem abrir a página já rolando
})();