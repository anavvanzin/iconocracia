/*
 * FUNDIÇÃO — carregamento e validação do manifesto de lotes.
 *
 * O manifesto é a ponte entre o corpus e o jogo. Ele é validado antes do
 * primeiro quadro: uma página quebrada nunca chega a mostrar a platina vazia,
 * mas um cartão de erro recuperável.
 */

export const EIXOS_CANONICOS = [
  'desincorporacao',
  'rigidez_postural',
  'dessexualizacao',
  'uniformizacao_facial',
  'heraldizacao',
  'enquadramento_arquitetonico',
  'apagamento_narrativo',
  'monocromatizacao',
  'serialidade',
  'inscricao_estatal',
];

const ETAPAS_CONHECIDAS = ['fundacional', 'normativo', 'militar', 'contra-alegoria'];

function falhar(mensagem) {
  throw new Error('Manifesto do jogo inválido: ' + mensagem);
}

/** Valida a forma do manifesto. Lança Error com a razão exata. */
export function validarManifesto(documento) {
  if (!documento || typeof documento !== 'object') falhar('a raiz não é um objeto.');
  if (typeof documento.schema_version !== 'string' || !documento.schema_version) {
    falhar('schema_version ausente.');
  }
  if (!Array.isArray(documento.eixos) || documento.eixos.length !== EIXOS_CANONICOS.length) {
    falhar('a lista de eixos não tem dez entradas.');
  }
  const chaves = documento.eixos.map((eixo) => eixo && eixo.chave);
  EIXOS_CANONICOS.forEach((chave, ordem) => {
    if (chaves[ordem] !== chave) {
      falhar('o eixo ' + ordem + ' deveria ser ' + chave + ' e é ' + chaves[ordem] + '.');
    }
  });
  if (!Array.isArray(documento.lotes) || documento.lotes.length === 0) {
    falhar('não há lotes.');
  }
  documento.lotes.forEach((lote, ordem) => {
    if (!lote || typeof lote.id !== 'string' || !lote.id) falhar('lote ' + ordem + ' sem id.');
    if (!ETAPAS_CONHECIDAS.includes(lote.etapa)) falhar('lote ' + lote.id + ' com etapa desconhecida.');
    if (typeof lote.titulo !== 'string' || !lote.titulo) falhar('lote ' + lote.id + ' sem título.');
    if (!lote.matriz || typeof lote.matriz !== 'object') falhar('lote ' + lote.id + ' sem matriz.');
    EIXOS_CANONICOS.forEach((chave) => {
      const valor = lote.matriz[chave];
      if (!Number.isInteger(valor) || valor < 0 || valor > 3) {
        falhar('lote ' + lote.id + ' com eixo ' + chave + ' fora da escala 0–3.');
      }
    });
    if (!Number.isInteger(lote.carimbos) || lote.carimbos < 1) falhar('lote ' + lote.id + ' sem orçamento de carimbos.');
    if (!Number.isInteger(lote.segundos) || lote.segundos < 10) falhar('lote ' + lote.id + ' sem tempo de fundição.');
    if (typeof lote.image !== 'string' || !lote.image) falhar('lote ' + lote.id + ' sem imagem.');
  });
  return documento;
}

/** Busca o manifesto e valida-o. */
export async function carregarManifesto(url = 'data/jogo.json') {
  let resposta;
  try {
    resposta = await fetch(url, { cache: 'no-cache' });
  } catch (erro) {
    throw new Error('Não foi possível alcançar o manifesto do jogo.');
  }
  if (!resposta.ok) {
    throw new Error('O manifesto do jogo respondeu ' + resposta.status + '.');
  }
  let documento;
  try {
    documento = await resposta.json();
  } catch (erro) {
    throw new Error('O manifesto do jogo não é JSON válido.');
  }
  return validarManifesto(documento);
}

/** Agrupa os lotes por etapa, preservando a ordem de campanha. */
export function agruparPorEtapa(lotes) {
  const ordem = ['fundacional', 'normativo', 'militar', 'contra-alegoria'];
  const grupos = new Map(ordem.map((etapa) => [etapa, []]));
  lotes.forEach((lote) => {
    if (!grupos.has(lote.etapa)) grupos.set(lote.etapa, []);
    grupos.get(lote.etapa).push(lote);
  });
  return ordem
    .filter((etapa) => grupos.get(etapa).length > 0)
    .map((etapa) => ({ etapa, lotes: grupos.get(etapa) }));
}

export function lotePorId(lotes, id) {
  return lotes.find((lote) => lote.id === id) || null;
}

/** Índice do lote dentro da campanha, pela ordem do manifesto. */
export function posicaoDe(lotes, id) {
  return lotes.findIndex((lote) => lote.id === id);
}
