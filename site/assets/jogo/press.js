/*
 * FUNDIÇÃO — simulação da prensa.
 *
 * Módulo puro: guarda o estado do lote e a máquina de fases, e não toca o DOM.
 * A renderização (render.js) observa o estado; a simulação emite intenções.
 *
 * Nenhum valor agregado dos dez eixos existe aqui. A pontuação conta acertos
 * por eixo; os eixos nunca são somados em um número único.
 */

export const EIXOS = [
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

/** Fases da máquina, em ordem de fluxo normal. */
export const FASES = {
  LOADING: 'loading',
  BRIEFING: 'briefing',
  STRIKING: 'striking',
  CASTING: 'casting',
  DOSSIER: 'dossier',
  FAILED: 'failed',
  NEXT: 'next',
};

/** Pontos por eixo acertado, antes do multiplicador de combo. */
export const PONTOS_POR_EIXO = 100;
/** Bônus por segundo restante quando o emblema é cunhado. */
export const PONTOS_POR_SEGUNDO = 2;
/** Bônus pela fundição precisa: nenhum carimbo desperdiçado. */
export const PONTOS_PRECISAO = 250;

/** Segundos cobrados por leitura de matriz (eixo ainda não revelado). */
export const CUSTO_LEITURA = 2;

/**
 * Quantos eixos da matriz já são lidos quando o lote abre.
 * A etapa I entrega a matriz inteira (etapa de aprendizado); as demais a
 * entregam parcialmente, e o jogador paga o relógio para ler o resto.
 */
export const COTA_MATRIZ = {
  fundacional: 10,
  normativo: 6,
  militar: 5,
  'contra-alegoria': 4,
};

/** Rótulos de etapa para a interface. */
export const ETAPAS = {
  fundacional: { roman: 'I', nome: 'Fundacional' },
  normativo: { roman: 'II', nome: 'Normativo' },
  militar: { roman: 'III', nome: 'Militar' },
  'contra-alegoria': { roman: 'IV', nome: 'Contra-alegoria' },
};

export function criarEstado(lote, posicao, total) {
  const inicio = Number.isInteger(lote.inicio) ? lote.inicio : 0;
  const valores = {};
  const cota = Math.min(EIXOS.length, COTA_MATRIZ[lote.etapa] ?? EIXOS.length);
  const revelados = {};
  EIXOS.forEach((eixo, ordem) => {
    valores[eixo] = inicio;
    revelados[eixo] = ordem < cota;
  });
  return {
    fase: FASES.LOADING,
    lote,
    posicao,
    total,
    eixoSelecionado: 0,
    valores,
    alvo: { ...lote.matriz },
    revelados,
    cota,
    carimbosRestantes: lote.carimbos,
    carimbosUsados: 0,
    combo: 0,
    melhorCombo: 0,
    pontos: 0,
    pontosPorEixo: 0,
    bonusTempo: 0,
    bonusPrecisao: 0,
    tempoRestante: lote.segundos,
    tempoTotal: lote.segundos,
    eixosNoAlvo: 0,
    golpesErrados: 0,
    leituras: 0,
    custoLeitura: CUSTO_LEITURA,
    inicio,
    pausado: false,
    motivoFalha: null,
  };
}

/**
 * Uma etapa de contra-alegoria começa na máxima fixidez: o Estado pede o
 * emblema pleno, e o jogador recusa até deixar a figura viva.
 */
export function ehContraAlegoria(lote) {
  return lote.etapa === 'contra-alegoria';
}

/** Na etapa invertida, a recusa leva o eixo ao alvo; nas demais, sobe um degrau. */
export function valorAposGolpe(lote, eixo, atual) {
  if (!ehContraAlegoria(lote)) return atual + 1;
  return alvoDe(lote, eixo);
}

export function alvoDe(lote, eixo) {
  return Number(lote.matriz[eixo] ?? 0);
}

export function valorDe(estado, eixo) {
  return Number(estado.valores[eixo] ?? 0);
}

/** O eixo já está no valor pedido pela matriz? */
export function eixoNoAlvo(estado, eixo) {
  return valorDe(estado, eixo) === alvoDe(estado.lote, eixo);
}

export function todosNoAlvo(estado) {
  return EIXOS.every((eixo) => eixoNoAlvo(estado, eixo));
}

export function eixosNoAlvo(estado) {
  return EIXOS.filter((eixo) => eixoNoAlvo(estado, eixo)).length;
}

/** O valor da matriz deste eixo já foi lido pelo jogador? */
export function eixoRevelado(estado, eixo) {
  return Boolean(estado.revelados[eixo]);
}

/**
 * Um golpe é "certo" quando leva o eixo ao valor da matriz sem ultrapassá-lo.
 * Nas etapas de purificação, o eixo sobe um degrau e acerta se ainda havia
 * degrau até o alvo. Na etapa invertida, o golpe é uma recusa: acerta quando o
 * eixo ainda estava acima do perfil real, e desperdiça o carimbo quando já
 * estava no perfil.
 */
export function golpeEhCerto(estado, eixo) {
  const atual = valorDe(estado, eixo);
  const alvo = alvoDe(estado.lote, eixo);
  if (ehContraAlegoria(estado.lote)) return atual > alvo;
  return atual < alvo;
}

/**
 * Lê a matriz: um eixo ainda não revelado passa a ser conhecido e o relógio
 * cobra o esforço. Não consome carimbo — a leitura é de graça para o orçamento
 * e cara para o tempo.
 */
export function lerMatriz(estado, eixo) {
  estado.revelados = { ...estado.revelados, [eixo]: true };
  estado.leituras += 1;
  estado.tempoRestante = Math.max(0, estado.tempoRestante - CUSTO_LEITURA);
  const evento = {
    tipo: 'leitura',
    eixo,
    alvo: alvoDe(estado.lote, eixo),
    custo: CUSTO_LEITURA,
  };
  if (estado.tempoRestante <= 0) {
    falhar(estado, 'tempo');
    evento.tipo = 'leitou-e-falhou';
  }
  return evento;
}

/**
 * Aplica um golpe. Devolve um evento descrevendo o que aconteceu, para que a
 * camada de apresentação possa tocar som, acender a alavanca e contabilizar o
 * combo. A simulação não toca em nada visual.
 */
export function golpear(estado, eixo) {
  if (estado.fase !== FASES.STRIKING || estado.pausado) {
    return { tipo: 'ignorado', eixo };
  }
  if (!EIXOS.includes(eixo)) {
    return { tipo: 'ignorado', eixo };
  }
  if (!eixoRevelado(estado, eixo)) {
    return lerMatriz(estado, eixo);
  }
  if (estado.carimbosRestantes <= 0) {
    return { tipo: 'ignorado', eixo, motivo: 'sem-carimbos' };
  }

  const atual = valorDe(estado, eixo);
  const alvo = alvoDe(estado.lote, eixo);
  const certo = golpeEhCerto(estado, eixo);

  if (certo) {
    // O golpe leva o eixo ao alvo sem ultrapassá-lo: quem erra não avança,
    // apenas perde o carimbo e o combo.
    estado.valores = { ...estado.valores, [eixo]: valorAposGolpe(estado.lote, eixo, atual) };
    estado.combo += 1;
    estado.melhorCombo = Math.max(estado.melhorCombo, estado.combo);
    if (eixoNoAlvo(estado, eixo)) {
      estado.pontosPorEixo += PONTOS_POR_EIXO * estado.combo;
      estado.eixosNoAlvo = eixosNoAlvo(estado);
    }
  } else {
    estado.combo = 0;
    estado.golpesErrados += 1;
  }

  estado.carimbosRestantes -= 1;
  estado.carimbosUsados += 1;

  const evento = {
    tipo: certo ? 'acerto' : 'erro',
    eixo,
    valor: valorDe(estado, eixo),
    alvo,
    combo: estado.combo,
    noAlvo: eixoNoAlvo(estado, eixo),
  };

  if (todosNoAlvo(estado)) {
    fecharLote(estado);
    evento.tipo = 'cunhou';
  } else if (estado.carimbosRestantes <= 0) {
    falhar(estado, 'sem-carimbos');
    evento.tipo = 'falhou';
  }
  return evento;
}

/** Conclui a fundição: calcula os bônus e move para a fase de cunhagem. */
export function fecharLote(estado) {
  if (estado.fase === FASES.CASTING || estado.fase === FASES.DOSSIER) return;
  estado.fase = FASES.CASTING;
  estado.bonusTempo = Math.max(0, Math.round(estado.tempoRestante)) * PONTOS_POR_SEGUNDO;
  // Fundição precisa: nenhum carimbo desperdiçado, isto é, todo golpe dados
  // levou um eixo ao alvo.
  estado.bonusPrecisao = estado.golpesErrados === 0 ? PONTOS_PRECISAO : 0;
  estado.pontos = estado.pontosPorEixo + estado.bonusTempo + estado.bonusPrecisao;
}

/** A prensa termina de cunhar e o dossiê do objeto pode abrir. */
export function abrirDossie(estado) {
  if (estado.fase !== FASES.CASTING) return;
  estado.fase = FASES.DOSSIER;
}

/** A fundição falhou: o relógio ou os carimbos acabaram. */
export function falhar(estado, motivo) {
  if (estado.fase === FASES.FAILED || estado.fase === FASES.DOSSIER) return;
  estado.fase = FASES.FAILED;
  estado.motivoFalha = motivo || 'tempo';
  estado.pontos = 0;
}

/** Avança o relógio. Devolve true quando o tempo acabou. */
export function tick(estado, deltaSegundos) {
  if (estado.fase !== FASES.STRIKING || estado.pausado) return false;
  estado.tempoRestante = Math.max(0, estado.tempoRestante - deltaSegundos);
  if (estado.tempoRestante <= 0) {
    falhar(estado, 'tempo');
    return true;
  }
  return false;
}

/** A ficha do lote entrou na platina: a prensa pode ser operada. */
export function abrirBriefing(estado) {
  if (estado.fase !== FASES.LOADING) return;
  estado.fase = FASES.BRIEFING;
}

export function iniciarGolpe(estado) {
  if (estado.fase !== FASES.BRIEFING) return;
  estado.fase = FASES.STRIKING;
}

export function selecionar(estado, eixo) {
  const ordem = EIXOS.indexOf(eixo);
  if (ordem >= 0) estado.eixoSelecionado = ordem;
  return estado.eixoSelecionado;
}

export function moverSelecao(estado, delta) {
  const total = EIXOS.length;
  estado.eixoSelecionado = (estado.eixoSelecionado + delta + total) % total;
  return estado.eixoSelecionado;
}

/**
 * Estado serializável para inspeção. Só o progresso de campanha:
 * nunca o estado de um lote em andamento.
 */
export function serializarProgresso(estado) {
  return {
    posicao: estado.posicao,
    total: estado.total,
    pontos: estado.pontos,
    eixosNoAlvo: estado.eixosNoAlvo,
    melhorCombo: estado.melhorCombo,
    pontosPorEixo: estado.pontosPorEixo,
    bonusTempo: estado.bonusTempo,
    bonusPrecisao: estado.bonusPrecisao,
    fase: estado.fase,
  };
}
