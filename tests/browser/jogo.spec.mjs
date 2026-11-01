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
