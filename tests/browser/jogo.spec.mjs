/*
 * FUNDIÇÃO — suíte do gabinete (/jogo).
 *
 * Cobre: boot, verbos, HUD, dossiê, falha, responsividade, teclado,
 * movimento reduzido, deep-link e o overlay de depuração.
 */

import { test, expect } from '@playwright/test';

const LOTES = 'data/jogo.json';

async function lerManifesto(page) {
  const resposta = await page.request.get('/' + LOTES);
  return resposta.json();
}

/** Uns golpes de abertura, para a captura mostrar a prensa em operação. */
async function golpesIniciais(page) {
  for (const eixo of ['desincorporacao', 'rigidez_postural', 'dessexualizacao', 'heraldizacao']) {
    const botao = page.locator('#jogo-alavancas button[data-eixo="' + eixo + '"]');
    if (await botao.isDisabled()) break;
    await botao.click();
  }
}

/** No móvel a matriz é uma gaveta: ela precisa estar aberta para ser usada. */
async function abrirMatriz(page) {
  const gaveta = page.locator('#jogo-gaveta');
  if (!(await gaveta.isVisible())) return;
  const aberta = await page.locator('#jogo-matriz').getAttribute('data-aberta');
  if (aberta !== '1') await gaveta.click();
}

/** Espera o manifesto carregar e o primeiro lote entrar na platina. */
async function abrirJogo(page, consulta = '') {
  await page.goto('/jogo' + consulta);
  await expect(page.locator('#jogo-platen')).toBeVisible();
  await expect(page.locator('#jogo-alavancas button')).toHaveCount(10);
  await expect(page.locator('#jogo-lote-titulo')).not.toHaveText('—');
}

async function comecar(page) {
  await expect(page.locator('#jogo-acao')).toBeEnabled();
  await page.locator('#jogo-acao').click();
  await abrirMatriz(page);
  await expect(page.locator('#jogo-acao')).toHaveText(/ESTAMPAR|COMEÇAR|RECUSAR/);
}

test.describe('FUNDIÇÃO — o gabinete', () => {

  test('7 · o gabinete abre e chega à primeira tela acionável', async ({ page }) => {
    const resposta = await page.goto('/jogo');
    expect(resposta.status()).toBe(200);
    const inicio = Date.now();
    await expect(page.locator('#jogo-alavancas button')).toHaveCount(10);
    await expect(page.locator('#jogo-acao')).toBeEnabled();
    expect(Date.now() - inicio).toBeLessThan(4000);
    // O briefing nomeia o objeto real do primeiro lote.
    await expect(page.locator('#jogo-lote-titulo')).not.toHaveText('—');
    await expect(page.locator('#jogo-etapa-nome')).toHaveText('Fundacional');
  });

  test('8 · um golpe sobe exatamente um eixo, um alvo e um carimbo', async ({ page }) => {
    await abrirJogo(page);
    await comecar(page);
    const eixo = 'rigidez_postural';
    const antes = await page.locator('#jogo-carimbos').textContent();
    const platen = page.locator('#jogo-platen');
    const valorAntes = await platen.getAttribute('data-t-' + eixo);
    const outrosAntes = await platen.getAttribute('data-t-dessexualizacao');

    await page.locator('#jogo-alavancas button[data-eixo="' + eixo + '"]').click();

    await expect(page.locator('#jogo-carimbos')).toHaveText(String(Number(antes) - 1));
    await expect(platen).toHaveAttribute('data-t-' + eixo, String(Number(valorAntes) + 1));
    // Nenhum outro eixo se move.
    await expect(platen).toHaveAttribute('data-t-dessexualizacao', outrosAntes);
    // O nome acessível da alavanca passa a dizer o valor atual.
    await expect(page.locator('#jogo-alavancas button[data-eixo="' + eixo + '"]'))
      .toHaveAttribute('aria-label', /atual \d/);
  });

  test('9 · um lote inteiro pode ser cunhado e o dossiê abre com a citação real', async ({ page }) => {
    await abrirJogo(page);
    await comecar(page);
    const manifesto = await lerManifesto(page);
    const lote = manifesto.lotes[0];

    for (const [eixo, alvo] of Object.entries(lote.matriz)) {
      for (let i = 0; i < alvo; i += 1) {
        await page.locator('#jogo-alavancas button[data-eixo="' + eixo + '"]').click();
      }
    }

    const dossie = page.locator('#jogo-dossie');
    await expect(dossie).toBeVisible();
    await expect(page.locator('#jogo-dossie-corpo')).toContainText(lote.titulo);
    // A citação arquivada real aparece no dossiê.
    await expect(page.locator('#jogo-dossie-corpo')).toContainText(
      lote.citacao.split('Disponível em:')[0].trim().slice(0, 40),
    );
    // A legenda metodológica do corpus está presente.
    await expect(page.locator('#jogo-dossie-corpo'))
      .toContainText('atos interpretativos situados, não dados neutros');
    // Os dez eixos aparecem um a um — nunca somados.
    await expect(page.locator('#jogo-dossie-corpo .jogo-dossie__eixo')).toHaveCount(10);
  });

  test('10 · o fim dos carimbos produz a fase falha e a affordsance de repetir', async ({ page }) => {
    await abrirJogo(page);
    await comecar(page);
    const manifesto = await lerManifesto(page);
    const lote = manifesto.lotes[0];

    // Estoure o orçamento com golpes errados (eixos cujo alvo é zero).
    const eixoZero = Object.entries(lote.matriz).find(([, alvo]) => alvo === 0);
    test.skip(!eixoZero, 'o primeiro lote não tem eixo de alvo zero');
    const botao = page.locator('#jogo-alavancas button[data-eixo="' + eixoZero[0] + '"]');
    for (let i = 0; i < lote.carimbos + 2; i += 1) {
      if (await botao.isDisabled()) break;
      await botao.click();
    }

    await expect(page.locator('#jogo-overlay')).toContainText('Fundição imperfeita');
    await expect(page.locator('#jogo-overlay button[data-acao="repetir"]')).toBeVisible();
  });

  test('11 · o HUD não invade a platina em 1440×900 e em 390×844', async ({ page }) => {
    for (const [nome, viewport] of Object.entries({
      desktop: { width: 1440, height: 900 },
      mobile: { width: 390, height: 844 },
    })) {
      await page.setViewportSize(viewport);
      // A captura usa o tema que o sitio serve por omissao (o modo noite),
      // para que a imagem seja a face publica do gabinete.
      await page.emulateMedia({ colorScheme: 'dark' });
      await abrirJogo(page);
      await comecar(page);
      await golpesIniciais(page);
      // No móvel a captura do gabinete mostra a gaveta fechada.
      const matriz = page.locator('#jogo-matriz');
      if ((await matriz.getAttribute('data-aberta')) === '1') {
        await page.locator('#jogo-gaveta').click();
        // A gaveta fecha com transição: espera ela assentar antes da captura.
        await page.waitForTimeout(450);
      }
      const hud = await page.locator('.jogo-hud').boundingBox();
      const palco = await page.locator('.jogo-palco').boundingBox();
      expect(hud).not.toBeNull();
      expect(palco).not.toBeNull();
      // Sem sobreposição vertical entre o HUD e a platina.
      expect(hud.y + hud.height).toBeLessThanOrEqual(palco.y + 1);
      await page.screenshot({ path: 'test-results/jogo/' + nome + '.png', fullPage: false });
    }
  });

  test('12 · uma partida só de teclado funciona e o espaço não rola a página', async ({ page }) => {
    await abrirJogo(page);
    await expect(page.locator('#jogo-acao')).toBeEnabled();
    await page.keyboard.press('Space');
    await expect(page.locator('#jogo-acao')).toHaveText(/ESTAMPAR/);

    // A seleção anda com as setas e o número escolhe a alavanca.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('2');
    const selecionada = page.locator('#jogo-alavancas button[data-selecionado="1"]');
    await expect(selecionada).toHaveAttribute('data-eixo', 'rigidez_postural');
    await expect(selecionada).toBeFocused();

    const antes = await page.locator('#jogo-carimbos').textContent();
    const rolagemAntes = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('Space');
    await expect(page.locator('#jogo-carimbos')).toHaveText(String(Number(antes) - 1));
    // O espaço não rola a página.
    expect(await page.evaluate(() => window.scrollY)).toBe(rolagemAntes);
    // O foco permanece visível na alavanca selecionada.
    await expect(selecionada).toHaveAttribute('data-selecionado', '1');
  });

  test('13 · o movimento reduzido desliga a camada de efeitos sem quebrar o laço', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await abrirJogo(page);
    await comecar(page);
    await expect(page.locator('#jogo-fx')).toBeHidden();
    const antes = await page.locator('#jogo-carimbos').textContent();
    await page.locator('#jogo-alavancas button[data-eixo="heraldizacao"]').click();
    await expect(page.locator('#jogo-carimbos')).toHaveText(String(Number(antes) - 1));
    await expect(page.locator('#jogo-platen')).toHaveAttribute('data-t-heraldizacao', '1');
  });

  test('14 · o deep-link abre o lote pedido e o overlay de depuração renderiza', async ({ page }) => {
    const manifesto = await lerManifesto(page);
    const alvo = manifesto.lotes.find((lote) => lote.id === 'BR-006');
    expect(alvo).toBeTruthy();
    await abrirJogo(page, '?lote=BR-006');
    // O HUD mostra o título sem o parêntese de autoria; o dossiê mostra o inteiro.
    const tituloCurto = alvo.titulo.replace(/\s*\([^)]*\)\s*$/, '');
    await expect(page.locator('#jogo-lote-titulo')).toHaveText(tituloCurto);

    await abrirJogo(page, '?debug=1');
    await expect(page.locator('#jogo-debug')).toBeVisible();
    await expect(page.locator('#jogo-debug')).toContainText('BR-006');
  });

  test('15 · a etapa de contra-alegoria recusa em vez de estampar', async ({ page }) => {
    await abrirJogo(page, '?lote=FR-031');
    await comecar(page);
    await expect(page.locator('#jogo-acao')).toHaveText(/RECUSAR/);
    const manifesto = await lerManifesto(page);
    const lote = manifesto.lotes.find((item) => item.id === 'FR-031');

    // A figura começa na máxima fixidez: o Estado pede o emblema pleno.
    await expect(page.locator('#jogo-platen')).toHaveAttribute('data-t-dessexualizacao', '3');
    // A matriz vem parcial: as alavancas não lidas continuam ocultas.
    await expect(
      page.locator('#jogo-alavancas button[data-eixo="monocromatizacao"] .jogo-alavanca__alvo'),
    ).toHaveText('não lido');
    // A recusa leva o eixo direto ao perfil real do objeto.
    await page.locator('#jogo-alavancas button[data-eixo="dessexualizacao"]').click();
    await expect(page.locator('#jogo-platen'))
      .toHaveAttribute('data-t-dessexualizacao', String(lote.matriz.dessexualizacao));
  });

});

const CHAVE = 'iconocracia:fundicao:v1';

async function cunhar(page, lote) {
  for (const [eixo, alvo] of Object.entries(lote.matriz)) {
    const alavanca = page.locator('#jogo-alavancas button[data-eixo="' + eixo + '"]');
    if (await alavanca.locator('.jogo-alavanca__alvo').textContent() === 'não lido') {
      await alavanca.click();
    }
    const golpes = lote.etapa === 'contra-alegoria' ? (alvo < 3 ? 1 : 0) : alvo;
    for (let i = 0; i < golpes; i++) await alavanca.click();
  }
  await expect(page.locator('#jogo-dossie')).toBeVisible();
}

test('regressão · conclusão persiste, desbloqueia e encerra a campanha', async ({ page }) => {
  const manifesto = await lerManifesto(page);
  manifesto.lotes = manifesto.lotes.slice(0, 2);
  await page.route('**/data/jogo.json', route => route.fulfill({ json: manifesto }));
  await abrirJogo(page);
  await comecar(page);
  await cunhar(page, manifesto.lotes[0]);
  expect(await page.locator('#jogo-dossie').evaluate(el => el.matches(':modal'))).toBe(true);
  expect(await page.evaluate(chave => JSON.parse(localStorage.getItem(chave)).concluidos, CHAVE))
    .toEqual({ [manifesto.lotes[0].id]: true });
  await page.reload();
  await expect(page.locator('#jogo-acao')).toBeEnabled();
  await page.locator('#jogo-mapa').click();
  const primeiro = page.locator('#jogo-mapa-lista button[data-lote="' + manifesto.lotes[0].id + '"]');
  const segundo = page.locator('#jogo-mapa-lista button[data-lote="' + manifesto.lotes[1].id + '"]');
  await expect(primeiro).toContainText('cunhado');
  await expect(segundo).toBeEnabled();
  await segundo.click();
  await comecar(page);
  await cunhar(page, manifesto.lotes[1]);
  await expect(page.locator('#jogo-dossie-proximo')).toHaveText('CONCLUIR CAMPANHA');
  await page.locator('#jogo-dossie-proximo').click();
  await expect(page.locator('#jogo-dossie-corpo')).toContainText('Campanha concluída');
  expect(await page.locator('#jogo-dossie').evaluate(el => el.matches(':modal'))).toBe(true);
});

test('regressão · leitura que esgota o relógio oferece repetição', async ({ page }) => {
  const manifesto = await lerManifesto(page);
  const lote = manifesto.lotes.find(lote => lote.etapa === 'normativo');
  lote.segundos = 10;
  await page.route('**/data/jogo.json', route => route.fulfill({ json: { ...manifesto, lotes: [lote] } }));
  await page.clock.install();
  await abrirJogo(page);
  await comecar(page);
  await page.clock.runFor(8500);
  await page.locator('#jogo-alavancas button').nth(9).click();
  await expect(page.locator('#jogo-overlay button[data-acao="repetir"]')).toBeVisible();
  expect(await page.evaluate(chave => JSON.parse(localStorage.getItem(chave)).concluidos, CHAVE)).toEqual({});
  await page.locator('#jogo-overlay button[data-acao="repetir"]').click();
  await comecar(page);
  await expect(page.locator('#jogo-alavancas button').first()).toBeEnabled();
});

test('regressão · QWERTY e setas mantêm seleção e foco juntos', async ({ page }) => {
  await abrirJogo(page);
  await comecar(page);
  await page.keyboard.press('r');
  await expect(page.locator('#jogo-alavancas button').nth(3)).toBeFocused();
  await page.keyboard.press('q');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#jogo-alavancas button').nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#jogo-platen')).toHaveAttribute('data-t-rigidez_postural', '1');
  await expect(page.locator('#jogo-platen')).toHaveAttribute('data-t-desincorporacao', '0');
});

test('regressão · pausa automática expõe continuar e imagem falha mantém fonte', async ({ page }) => {
  await page.route('**/images/**', route => route.abort());
  const manifesto = await lerManifesto(page);
  await page.route('**/' + manifesto.lotes[0].image.replace(/^\//, ''), route => route.abort());
  await abrirJogo(page);
  await comecar(page);
  await expect(page.locator('#jogo-platen-legenda')).toContainText('Reprodução indisponível');
  await page.locator('#jogo-alavancas button').nth(1).click();
  await expect(page.locator('#jogo-platen-legenda')).toContainText(manifesto.lotes[0].fonte_url);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('#jogo-pausa')).toHaveText('Continuar');
  await expect(page.locator('#jogo-pausa')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, value: false }));
  await page.locator('#jogo-pausa').click();
  await expect(page.locator('#jogo-pausa')).toHaveText('Pausar');
});

test('regressão · relógio esgotado desativa ações e permite recomeçar', async ({ page }) => {
  const manifesto = await lerManifesto(page);
  manifesto.lotes[0].segundos = 10;
  await page.route('**/data/jogo.json', route => route.fulfill({ json: manifesto }));
  await page.clock.install();
  await abrirJogo(page);
  await comecar(page);
  await page.clock.runFor(11000);
  await expect(page.locator('#jogo-acao')).toBeDisabled();
  await expect(page.locator('#jogo-alavancas button').first()).toBeDisabled();
  await page.locator('#jogo-overlay button[data-acao="repetir"]').click();
  await comecar(page);
  await expect(page.locator('#jogo-acao')).toBeEnabled();
});

test('regressão · canvas medido no início e efeitos em coordenadas locais', async ({ page }) => {
  await abrirJogo(page);
  await comecar(page);
  const medida = await page.locator('#jogo-fx').evaluate(canvas => {
    const caixa = canvas.getBoundingClientRect();
    window.aneis = [];
    const ctx = canvas.getContext('2d');
    const arc = ctx.arc.bind(ctx);
    ctx.arc = (...args) => { window.aneis.push(args.slice(0, 2)); return arc(...args); };
    return { width: canvas.width, esperado: Math.round(caixa.width * devicePixelRatio),
      x: caixa.width / 2, y: caixa.height / 2 };
  });
  expect(medida.width).toBe(medida.esperado);
  await page.locator('#jogo-alavancas button').nth(1).click();
  await expect.poll(() => page.evaluate(() => window.aneis.length)).toBeGreaterThan(0);
  const [x, y] = await page.evaluate(() => window.aneis[0]);
  expect(x).toBeCloseTo(medida.x);
  expect(y).toBeCloseTo(medida.y);
});

// Exercita a UI real; não escreve conclusões para testar o desbloqueio.
async function cunharCompleto(page, lote) {
  await comecar(page);
  for (const [eixo, alvo] of Object.entries(lote.matriz)) {
    const botao = page.locator(`[data-eixo="${eixo}"]`);
    const atual = Number(await page.locator('#jogo-platen').getAttribute('data-t-' + eixo));
    if (atual === alvo) continue;
    if (await botao.locator('.jogo-alavanca__alvo').textContent() === 'não lido') await botao.click();
    const golpes = lote.etapa === 'contra-alegoria' ? 1 : alvo - atual;
    for (let i = 0; i < golpes; i++) await botao.click();
  }
  await expect(page.locator('#jogo-dossie')).toBeVisible();
}

const mapaLote = (page, lote) => page.locator(`#jogo-mapa-lista [data-lote="${lote.id}"]`);

test('16 · cunhagens desbloqueiam o mapa e sobrevivem à recarga e à repetição', async ({ page }) => {
  const { lotes } = await lerManifesto(page);
  await abrirJogo(page);
  await page.locator('#jogo-mapa').click();
  await expect(mapaLote(page, lotes[1])).toBeDisabled();
  await page.locator('#jogo-mapa-fechar').click();
  await cunharCompleto(page, lotes[0]);
  await page.locator('#jogo-dossie-fechar').click();
  await page.locator('#jogo-mapa').click();
  await expect(mapaLote(page, lotes[0])).toHaveAttribute('data-estado', 'feito');
  await expect(mapaLote(page, lotes[1])).toBeEnabled();
  await expect(mapaLote(page, lotes[2])).toBeDisabled();
  await mapaLote(page, lotes[1]).click();
  await cunharCompleto(page, lotes[1]);
  await page.locator('#jogo-dossie-proximo').click();
  await expect(page.locator('#jogo-lote-titulo')).toHaveText(lotes[2].titulo.replace(/\s*\([^)]*\)\s*$/, ''));
  await page.reload();
  await expect(page.locator('#jogo-acao')).toBeEnabled();
  await page.locator('#jogo-mapa').click();
  await expect(mapaLote(page, lotes[1])).toHaveAttribute('data-estado', 'feito');
  await expect(mapaLote(page, lotes[2])).toBeEnabled();
  await expect(mapaLote(page, lotes[3])).toBeDisabled();
  await mapaLote(page, lotes[0]).click();
  await expect(page.locator('#jogo-acao')).toBeEnabled();
  await page.locator('#jogo-mapa').click();
  await expect(mapaLote(page, lotes[2])).toBeEnabled();
  await mapaLote(page, lotes[2]).click();
});

for (const completa of [false, true]) {
  test(`18 · último lote encerra o percurso; campanha completa=${completa}`, async ({ page }, testInfo) => {
    const { lotes } = await lerManifesto(page);
    if (completa) {
      // Prepara apenas os predecessores; o último é concluído pelos controles reais.
      await page.addInitScript(ids => localStorage.setItem('iconocracia:fundicao:v1', JSON.stringify({
        concluidos: Object.fromEntries(ids.map(id => [id, true])), posicao: 0,
      })), lotes.slice(0, -1).map(l => l.id));
    }
    await abrirJogo(page, '?lote=' + lotes.at(-1).id);
    await cunharCompleto(page, lotes.at(-1));
    await expect(page.locator('#jogo-dossie-proximo')).toHaveText('CONCLUIR CAMPANHA');
    await expect(page.locator('#jogo-dossie')).toHaveJSProperty('open', true);
    expect(await page.locator('#jogo-dossie').evaluate(el => el.matches(':modal'))).toBe(true);
    await expect(page.locator('#jogo-dossie')).toHaveAccessibleName(lotes.at(-1).titulo);
    await expect(page.locator('#jogo-dossie-titulo')).toBeInViewport();
    await expect(page.locator('#jogo-dossie-titulo')).toBeFocused();
    const caixa = await page.locator('#jogo-dossie').boundingBox();
    expect(caixa.y).toBeGreaterThanOrEqual(0);
    expect(caixa.y + caixa.height).toBeLessThanOrEqual(page.viewportSize().height);
    await page.screenshot({ path: testInfo.outputPath('dossie.png') });
    await page.locator('#jogo-dossie-proximo').click();
    await expect(page.locator('#jogo-dossie')).toHaveAccessibleName(completa ? 'Campanha concluída' : 'Fim do percurso');
    await expect(page.locator('#jogo-dossie-proximo')).toBeHidden();
    await page.locator('#jogo-dossie-fechar').click();
    await page.locator('#jogo-mapa').click();
    await expect(mapaLote(page, lotes.at(-1))).toHaveAttribute('data-estado', 'feito');
    await expect(mapaLote(page, lotes.at(-1))).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath('mapa.png') });
  });
}


test('regressão · Espaço respeita o botão focado e pausa desativa a prensa', async ({ page }) => {
  await abrirJogo(page);
  await comecar(page);
  const antes = await page.locator('#jogo-carimbos').textContent();
  await page.locator('#jogo-pausa').press('Space');
  await expect(page.locator('#jogo-pausa')).toHaveText('Continuar');
  await expect(page.locator('#jogo-acao')).toBeDisabled();
  await expect(page.locator('#jogo-alavancas button').first()).toBeDisabled();
  await page.locator('#jogo-pausa').press('Space');
  await expect(page.locator('#jogo-acao')).toBeEnabled();
  await page.locator('#jogo-mapa').press('Space');
  await expect(page.locator('#jogo-mapa-dialog')).toBeVisible();
  await expect(page.locator('#jogo-carimbos')).toHaveText(antes);
});

test('regressão · gaveta fechada sai da tabulação e atalho a abre', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirJogo(page);
  await comecar(page);
  await page.locator('#jogo-gaveta').click();
  const botoes = page.locator('#jogo-alavancas button');
  for (const botao of await botoes.all()) await expect(botao).toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('2');
  await expect(page.locator('#jogo-gaveta')).toHaveAttribute('aria-expanded', 'true');
  await expect(botoes.nth(1)).toBeFocused();
  await expect(botoes.nth(1)).toBeInViewport();
});

test('regressão · erro de imagem após timeout de carga preserva a fonte', async ({ page }) => {
  let liberar;
  const liberado = new Promise(resolve => { liberar = resolve; });
  await page.route('**/*', async route => {
    if (route.request().resourceType() !== 'image') return route.continue();
    await liberado;
    await route.abort();
  });
  try {
    await page.goto('/jogo', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#jogo-acao')).toBeEnabled({ timeout: 7000 });
  } finally {
    liberar();
  }
  await expect(page.locator('#jogo-platen-legenda')).toContainText('Reprodução indisponível');
  await comecar(page);
  await golpesIniciais(page);
  await expect(page.locator('#jogo-platen-legenda')).toContainText('Reprodução indisponível');
});

test('regressão · matriz já satisfeita conclui sem golpe errado nem perda de carimbo', async ({ page }) => {
  const manifesto = await lerManifesto(page);
  const lote = manifesto.lotes[0];
  lote.matriz = Object.fromEntries(Object.keys(lote.matriz).map(eixo => [eixo, 0]));
  await page.route('**/data/jogo.json', route => route.fulfill({ json: manifesto }));
  await abrirJogo(page);
  await expect(page.locator('#jogo-acao')).toBeEnabled();
  await page.locator('#jogo-overlay [data-acao="comecar"]').click();
  await expect(page.locator('#jogo-dossie')).toBeVisible();
  await expect(page.locator('#jogo-carimbos')).toHaveText(String(lote.carimbos));
  expect(await page.evaluate(chave => JSON.parse(localStorage.getItem(chave)).concluidos, CHAVE))
    .toEqual({ [lote.id]: true });
  await expect(page.locator('#jogo-dossie-corpo')).toContainText('0 de ' + lote.carimbos);
});

 test('24 · pausa no briefing desabilita o início e permite retomar', async ({ page }) => {
  await abrirJogo(page);
  const inicio = page.locator('#jogo-overlay [data-acao="comecar"]');
  await page.keyboard.press('Escape');
  await expect(inicio).toBeDisabled();
  await expect(page.locator('#jogo-acao')).toBeDisabled();
  await page.locator('#jogo-pausa').click();
  await expect(inicio).toBeEnabled();
  await inicio.click();
  await expect(page.locator('#jogo-overlay')).toBeHidden();
  await expect(page.locator('#jogo-acao')).toBeEnabled();
});
