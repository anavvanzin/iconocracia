/*
 * FUNDIÇÃO — o gabinete.
 *
 * Bootstrap: carrega o manifesto, liga a entrada, mantém o relógio e
 * conduz a máquina de fases. Toda a jogabilidade vive em press.js; aqui só
 * há ligação entre simulação, desenho, som e o que o jogador vê.
 */

import {
  EIXOS,
  FASES,
  ETAPAS,
  abrirBriefing,
  abrirDossie,
  criarEstado,
  ehContraAlegoria,
  golpear,
  iniciarGolpe,
  moverSelecao,
  selecionar,
  serializarProgresso,
  tick,
} from './press.js';
import { carregarManifesto, agruparPorEtapa, lotePorId, posicaoDe } from './levels.js';
import { criarRender } from './render.js';
import { criarAudio, criarEfeitos } from './fx.js';

const CHAVE_PROGRESSO = 'iconocracia:fundicao:v1';
const DURACAO_CUNHAGEM = 950;
const MAPA_TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];

const no = (seletor) => document.querySelector(seletor);

const refs = {
  etapaRomano: no('#jogo-etapa-romano'),
  etapaNome: no('#jogo-etapa-nome'),
  loteTitulo: no('#jogo-lote-titulo'),
  loteMeta: no('#jogo-lote-meta'),
  tempo: no('#jogo-tempo'),
  carimbos: no('#jogo-carimbos'),
  eixosNoAlvo: no('#jogo-eixos'),
  combo: no('#jogo-combo'),
  pontos: no('#jogo-pontos'),
  acao: no('#jogo-acao'),
  pausa: no('#jogo-pausa'),
  som: no('#jogo-som'),
  mapa: no('#jogo-mapa'),
  gaveta: no('#jogo-gaveta'),
  matriz: no('#jogo-matriz'),
  platen: no('#jogo-platen'),
  figs: no('#jogo-figs'),
  platenLegenda: no('#jogo-platen-legenda'),
  legenda: no('#jogo-legenda-faixa'),
  alavancas: no('#jogo-alavancas'),
  matrizNota: no('#jogo-matriz-nota'),
  matrizRodape: no('#jogo-matriz-rodape'),
  overlay: no('#jogo-overlay'),
  dossie: no('#jogo-dossie'),
  dossieCorpo: no('#jogo-dossie-corpo'),
  dossieFechar: no('#jogo-dossie-fechar'),
  dossieProximo: no('#jogo-dossie-proximo'),
  dossieRepetir: no('#jogo-dossie-repetir'),
  mapaDialog: no('#jogo-mapa-dialog'),
  mapaLista: no('#jogo-mapa-lista'),
  mapaFechar: no('#jogo-mapa-fechar'),
  controles: no('#jogo-controles'),
  controlesFechar: no('#jogo-controles-fechar'),
  debug: no('#jogo-debug'),
  fx: no('#jogo-fx'),
};

let manifesto = null;
let lotes = [];
let grupos = [];
let estado = null;
let render = null;
let efeitos = null;
let audio = null;
let progresso = { concluidos: {}, posicao: 0 };
let debugAtivo = false;
let eventos = [];
let ultimoQuadro = 0;
let relogioAvisado = -1;

/* ------------------------------------------------------------- persistência */

function carregarProgresso() {
  try {
    const bruto = window.localStorage.getItem(CHAVE_PROGRESSO);
    if (!bruto) return { concluidos: {}, posicao: 0 };
    const dados = JSON.parse(bruto);
    if (!dados || typeof dados !== 'object') return { concluidos: {}, posicao: 0 };
    return {
      concluidos: dados.concluidos && typeof dados.concluidos === 'object' ? dados.concluidos : {},
      posicao: Number.isInteger(dados.posicao) ? dados.posicao : 0,
    };
  } catch (erro) {
    return { concluidos: {}, posicao: 0 };
  }
}

function guardarProgresso() {
  try {
    window.localStorage.setItem(
      CHAVE_PROGRESSO,
      JSON.stringify({ concluidos: progresso.concluidos, posicao: progresso.posicao }),
    );
  } catch (erro) {
    /* Sem escrita local, o jogo segue funcionando. */
  }
}

/** Um lote está liberado quando o anterior foi cunhado. */
function lotesLiberados() {
  const liberados = {};
  if (lotes.length) liberados[lotes[0].id] = true;
  lotes.forEach((lote, ordem) => {
    if (ordem > 0 && progresso.concluidos[lotes[ordem - 1].id]) liberados[lote.id] = true;
  });
  return liberados;
}

/* ------------------------------------------------------------------ platina */

function montarPlaten() {
  refs.figs.replaceChildren();
  for (let slot = 0; slot < 3; slot += 1) {
    const figura = document.createElement('figure');
    figura.className = 'jogo-fig';
    figura.dataset.slot = String(slot);
    const imagem = document.createElement('img');
    imagem.decoding = 'async';
    imagem.alt = '';
    figura.append(imagem);
    refs.figs.append(figura);
  }
}

function definirImagem(lote) {
  const imagens = refs.figs.querySelectorAll('img');
  imagens.forEach((imagem) => {
    imagem.src = lote.image;
  });
}

/** Pré-carrega o WebP do lote; nunca bloqueia o gabinete. */
function precarregar(lote) {
  return new Promise((resolver) => {
    const imagem = new Image();
    let pronto = false;
    const concluir = (falhou) => {
      if (pronto) return;
      pronto = true;
      resolver(falhou);
    };
    imagem.addEventListener('load', () => concluir(false));
    imagem.addEventListener('error', () => concluir(true));
    imagem.src = lote.image;
    window.setTimeout(() => concluir(false), 4000);
  });
}

/* -------------------------------------------------------------------- ações */

function golpar(eixo) {
  if (!estado || estado.fase !== FASES.STRIKING) return;
  const evento = golpear(estado, eixo);
  if (evento.tipo === 'ignorado') return;
  selecionar(estado, eixo);
  if (evento.tipo === 'leitura') {
    audio.leitura();
  } else if (evento.tipo === 'erro') {
    audio.golpe(0.7);
  } else {
    audio.golpe(1);
    const botao = refs.alavancas.querySelector('[data-eixo="' + eixo + '"]');
    if (botao) {
      const caixa = refs.fx.getBoundingClientRect();
      efeitos.golpe(caixa.width / 2, caixa.height / 2, 1);
    }
  }
  if (estado.fase === FASES.FAILED) {
    render.mostrarAviso(estado, 'falha');
  }
  if (evento.tipo === 'cunhou') {
    progresso.concluidos[estado.lote.id] = true;
    guardarProgresso();
    const estadoCunhado = estado;
    audio.cunha();
    const caixa = refs.fx.getBoundingClientRect();
    efeitos.cunha(caixa.width / 2, caixa.height / 2);
    window.setTimeout(() => {
      if (estado !== estadoCunhado || estado.fase !== FASES.CASTING) return;
      abrirDossie(estado);
      mostrarDossie();
    }, DURACAO_CUNHAGEM);
  }
  pintar();
}

function acaoPrincipal() {
  if (!estado) return;
  if (estado.fase === FASES.BRIEFING) {
    iniciarGolpe(estado);
    render.esconderAviso();
    refs.acao.focus({ preventScroll: true });
    pintar();
    return;
  }
  if (estado.fase === FASES.STRIKING) {
    golpar(EIXOS[estado.eixoSelecionado]);
  }
}

function recusa() {
  if (!estado || estado.fase !== FASES.STRIKING) return;
  if (!ehContraAlegoria(estado.lote)) return;
  audio.recusa();
  golpar(EIXOS[estado.eixoSelecionado]);
}

function alternarPausa() {
  if (!estado) return;
  if (estado.fase !== FASES.STRIKING && estado.fase !== FASES.BRIEFING) return;
  estado.pausado = !estado.pausado;
  refs.pausa.setAttribute('aria-pressed', estado.pausado ? 'true' : 'false');
  refs.pausa.textContent = estado.pausado ? 'Continuar' : 'Pausar';
  pintar();
}

function mostrarDossie() {
  if (!estado) return;
  render.pintarDossie(estado);
  const proximo = lotes[estado.posicao + 1];
  refs.dossieProximo.hidden = false;
  refs.dossieProximo.textContent = proximo ? 'PRÓXIMO LOTE' : 'CONCLUIR CAMPANHA';
  if (!refs.dossie.open) refs.dossie.showModal();
}

function fecharDossie() {
  if (refs.dossie.open) refs.dossie.close();
}

function repetirLote() {
  fecharDossie();
  carregarLote(estado ? estado.posicao : 0);
}

function proximoLote() {
  fecharDossie();
  const proximo = estado ? estado.posicao + 1 : 0;
  if (proximo >= lotes.length) {
    mostrarFimDeCampanha();
    return;
  }
  carregarLote(proximo);
}

function mostrarFimDeCampanha() {
  const caixas = refs.dossieCorpo;
  caixas.replaceChildren();
  const titulo = document.createElement('h2');
  titulo.className = 'jogo-dossie__titulo';
  titulo.textContent = 'Campanha concluída';
  const texto = document.createElement('p');
  texto.className = 'jogo-dossie__descricao';
  texto.textContent =
    'Todos os lotes foram cunhados. A campanha lista objetos e citações — não um número sobre o acervo.';
  caixas.append(titulo, texto);
  refs.dossieProximo.hidden = true;
  if (!refs.dossie.open) refs.dossie.showModal();
}

/* ------------------------------------------------------------------- carga */

function carregarLote(posicao, opcoes = {}) {
  const lote = lotes[posicao];
  if (!lote) return;
  progresso.posicao = posicao;
  guardarProgresso();
  estado = criarEstado(lote, posicao, lotes.length);
  estado.pausado = false;
  refs.pausa.setAttribute('aria-pressed', 'false');
  refs.pausa.textContent = 'Pausar';
  definirImagem(lote);
  render.montarAlavancas(manifesto.eixos, estado);
  efeitos.limpar();
  refs.legenda.textContent = [lote.regime, lote.year ? String(lote.year) : null].filter(Boolean).join(' · ');
  pintar();
  const estadoCarregado = estado;
  efeitos.medir();
  precarregar(lote).then((falhou) => {
    if (estado !== estadoCarregado) return;
    estado.imagemIndisponivel = falhou;
    abrirBriefing(estado);
    render.mostrarAviso(estado, 'briefing');
    pintar();
  });
  void opcoes;
}

/* ---------------------------------------------------------------- pintura */

function pintar() {
  if (!estado) return;
  refs.pausa.setAttribute('aria-pressed', String(estado.pausado));
  refs.pausa.textContent = estado.pausado ? 'Continuar' : 'Pausar';
  render.pintarHud(estado);
  render.pintarAlavancas(estado);
  render.pintarPlaten(estado);
  render.pintarMatrizNota(estado);
  render.pintarRodape(estado);

  const contra = ehContraAlegoria(estado.lote);
  const emJogo = estado.fase === FASES.STRIKING;
  refs.acao.textContent = estado.fase === FASES.BRIEFING
    ? 'COMEÇAR A FUNDIÇÃO'
    : contra ? 'RECUSAR (R)' : 'ESTAMPAR (Espaço)';
  refs.acao.disabled = !(estado.fase === FASES.BRIEFING || emJogo);
  refs.alavancas.querySelectorAll('button').forEach((botao) => {
    botao.disabled = !emJogo;
  });
  refs.matriz.dataset.etapa = estado.lote.etapa;
  refs.pausa.disabled = !(estado.fase === FASES.BRIEFING || emJogo);

  if (estado.pausado) {
    refs.tempo.textContent = render.tempoTexto(estado.tempoRestante);
  }
  if (debugAtivo) pintarDebug();
}

function pintarDebug() {
  if (!refs.debug || !estado) return;
  const resumo = {
    ...serializarProgresso(estado),
    lote: estado.lote.id,
    valores: estado.valores,
    carimbosRestantes: estado.carimbosRestantes,
    tempoRestante: Math.round(estado.tempoRestante),
    combo: estado.combo,
    revelados: Object.keys(estado.revelados).filter((eixo) => estado.revelados[eixo]),
    eventos: eventos.slice(-12),
  };
  refs.debug.textContent = JSON.stringify(resumo, null, 2);
}

/* ------------------------------------------------------------------ relógio */

function quadro(agora) {
  const delta = ultimoQuadro ? (agora - ultimoQuadro) / 1000 : 0;
  ultimoQuadro = agora;
  if (estado && estado.fase === FASES.STRIKING && !estado.pausado) {
    if (!document.hidden && !refs.dossie.open) {
      if (tick(estado, delta)) {
        render.mostrarAviso(estado, 'falha');
        pintar();
      } else {
        const inteiro = Math.ceil(estado.tempoRestante);
        if (inteiro <= 10 && inteiro !== relogioAvisado) {
          relogioAvisado = inteiro;
          audio.relogio();
        }
        render.pintarHud(estado);
        if (debugAtivo) pintarDebug();
      }
    }
  }
  efeitos.desenhar(delta);
  window.requestAnimationFrame(quadro);
}

/* ------------------------------------------------------------------- entrada */

function tratarTecla(evento) {
  if (!estado) return;
  const alvo = evento.target;
  const emCampo = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA');
  if (emCampo) return;

  if (refs.dossie.open || refs.mapaDialog.open || refs.controles.open) {
    if (evento.key === 'Escape') {
      if (refs.dossie.open) fecharDossie();
      else if (refs.mapaDialog.open) refs.mapaDialog.close();
      else refs.controles.close();
    }
    return;
  }

  const tecla = evento.key;
  if (tecla === ' ' || tecla === 'Spacebar') {
    if (estado.fase === FASES.BRIEFING || estado.fase === FASES.STRIKING) {
      evento.preventDefault();
      acaoPrincipal();
    }
    return;
  }
  if (tecla === 'Enter') {
    if (alvo && alvo.tagName === 'BUTTON') return;
    evento.preventDefault();
    acaoPrincipal();
    return;
  }
  if (tecla === 'Escape') {
    evento.preventDefault();
    alternarPausa();
    return;
  }
  if (tecla === '?' || (tecla === '/' && evento.shiftKey)) {
    evento.preventDefault();
    refs.controles.showModal();
    return;
  }
  if (tecla === 'r' || tecla === 'R') {
    if (ehContraAlegoria(estado.lote) && estado.fase === FASES.STRIKING) {
      evento.preventDefault();
      recusa();
      return;
    }
  }
  if (tecla === 'ArrowDown' || tecla === 'ArrowRight') {
    evento.preventDefault();
    moverSelecao(estado, 1);
    pintar();
    focarSelecao();
    return;
  }
  if (tecla === 'ArrowUp' || tecla === 'ArrowLeft') {
    evento.preventDefault();
    moverSelecao(estado, -1);
    pintar();
    focarSelecao();
    return;
  }
  const posicaoMapa = MAPA_TECLAS.indexOf(tecla.toLowerCase());
  const posicaoTecla = posicaoMapa < 0 ? -1 : posicaoMapa % EIXOS.length;
  if (posicaoTecla >= 0 && posicaoTecla < EIXOS.length) {
    evento.preventDefault();
    selecionar(estado, EIXOS[posicaoTecla]);
    pintar();
    const botao = refs.alavancas.querySelector('[data-eixo="' + EIXOS[posicaoTecla] + '"]');
    if (botao) botao.focus({ preventScroll: true });
  }
}

function focarSelecao() {
  const botao = refs.alavancas.querySelector('[data-eixo="' + EIXOS[estado.eixoSelecionado] + '"]');
  if (botao) botao.focus({ preventScroll: true });
}

function ligarEntrada() {
  document.addEventListener('keydown', tratarTecla);
  refs.acao.addEventListener('click', acaoPrincipal);
  refs.pausa.addEventListener('click', alternarPausa);
  refs.som.addEventListener('click', () => {
    const mudo = audio.alternar();
    refs.som.setAttribute('aria-pressed', mudo ? 'false' : 'true');
    refs.som.textContent = mudo ? 'Som' : 'Som ligado';
  });
  refs.mapa.addEventListener('click', () => {
    render.pintarLinhaTempo(grupos, { concluidos: progresso.concluidos, liberados: lotesLiberados() });
    refs.mapaDialog.showModal();
  });
  refs.mapaFechar.addEventListener('click', () => refs.mapaDialog.close());
  refs.dossieFechar.addEventListener('click', fecharDossie);
  refs.dossieProximo.addEventListener('click', proximoLote);
  refs.dossieRepetir.addEventListener('click', repetirLote);
  refs.controlesFechar.addEventListener('click', () => refs.controles.close());
  refs.gaveta.addEventListener('click', () => {
    const aberta = refs.matriz.dataset.aberta === '1';
    refs.matriz.dataset.aberta = aberta ? '0' : '1';
    refs.gaveta.setAttribute('aria-expanded', aberta ? 'false' : 'true');
    refs.gaveta.textContent = aberta ? 'Matriz ▲' : 'Matriz ▼';
  });

  refs.alavancas.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-eixo]');
    if (!botao || botao.disabled) return;
    golpar(botao.dataset.eixo);
  });

  refs.mapaLista.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-lote]');
    if (!botao || botao.disabled) return;
    refs.mapaDialog.close();
    const posicao = posicaoDe(lotes, botao.dataset.lote);
    if (posicao >= 0) carregarLote(posicao);
  });

  refs.overlay.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-acao]');
    if (!botao) return;
    if (botao.dataset.acao === 'comecar') {
      iniciarGolpe(estado);
      render.esconderAviso();
      refs.acao.focus({ preventScroll: true });
      pintar();
    } else if (botao.dataset.acao === 'repetir') {
      render.esconderAviso();
      carregarLote(estado.posicao);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && estado) {
      estado.pausado = true;
      pintar();
    }
  });
  window.addEventListener('resize', () => efeitos.medir());
}

/* -------------------------------------------------------------------- início */

async function iniciar() {
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  efeitos = criarEfeitos(refs.fx, { reduzido: reduzido });
  audio = criarAudio();
  render = criarRender(refs);
  progresso = carregarProgresso();
  debugAtivo = new URLSearchParams(window.location.search).has('debug');
  if (debugAtivo && refs.debug) refs.debug.hidden = false;

  ligarEntrada();
  window.requestAnimationFrame(quadro);

  try {
    manifesto = await carregarManifesto('data/jogo.json');
  } catch (erro) {
    mostrarFalhaDeCarga(erro);
    return;
  }
  lotes = manifesto.lotes;
  grupos = agruparPorEtapa(lotes);
  render.registrarEixos(manifesto.eixos);
  montarPlaten();

  const parametro = new URLSearchParams(window.location.search).get('lote');
  const porParametro = parametro ? lotePorId(lotes, parametro) : null;
  const posicaoInicial = porParametro
    ? posicaoDe(lotes, porParametro.id)
    : Math.min(progresso.posicao, lotes.length - 1);
  carregarLote(Math.max(0, posicaoInicial));
}

function mostrarFalhaDeCarga(erro) {
  refs.overlay.hidden = false;
  const caixa = document.createElement('div');
  caixa.className = 'jogo-aviso';
  const titulo = document.createElement('h2');
  titulo.className = 'jogo-aviso__titulo';
  titulo.textContent = 'O gabinete não conseguiu abrir';
  const texto = document.createElement('p');
  texto.className = 'jogo-aviso__texto';
  texto.textContent =
    (erro && erro.message ? erro.message : 'Falha desconhecida.') +
    ' O acervo continua disponível na página principal.';
  const voltar = document.createElement('a');
  voltar.className = 'btn btn-primary jogo-aviso__acao';
  voltar.href = 'index.html';
  voltar.textContent = 'VOLTAR AO ACERVO';
  caixa.append(titulo, texto, voltar);
  refs.overlay.append(caixa);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
