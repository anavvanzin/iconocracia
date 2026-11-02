/*
 * FUNDIÇÃO — renderização.
 *
 * Observa o estado e pinta o DOM. Nunca muta o estado, nunca chama a
 * simulação. Tudo que o jogador lê aqui é texto real, para teclado e leitor
 * de tela.
 */

import { EIXOS, FASES, ETAPAS, alvoDe, valorDe, eixosNoAlvo, ehContraAlegoria } from './press.js';

/** Verbo da etapa: estampar na fundição, recusar na contra-alegoria. */
export function verboDaEtapa(etapa) {
  return etapa === 'contra-alegoria' ? 'recusar' : 'estampar';
}

function no(seletor) {
  return document.querySelector(seletor);
}

function elemento(tag, classe, texto) {
  const node = document.createElement(tag);
  if (classe) node.className = classe;
  if (texto !== undefined) node.textContent = texto;
  return node;
}

/** O HUD mostra o título sem o parêntese de autoria; o dossiê mostra o inteiro. */
function tituloCurto(titulo) {
  return String(titulo || '').replace(/\s*\([^)]*\)\s*$/, '');
}

function tempoTexto(segundos) {
  const inteiros = Math.max(0, Math.ceil(segundos));
  const minutos = Math.floor(inteiros / 60);
  const resto = inteiros % 60;
  return minutos + ':' + String(resto).padStart(2, '0');
}

export function criarRender(refs) {
  const alavancas = new Map();
  let nomesEixo = new Map();
  let tratamentosEixo = new Map();

  /* ---------------------------------------------------------------- matrizes */

  function registrarEixos(eixos) {
    nomesEixo = new Map(eixos.map((eixo) => [eixo.chave, eixo.nome]));
    tratamentosEixo = new Map(eixos.map((eixo) => [eixo.chave, eixo.tratamento]));
  }

  function nomeDoEixo(chave) {
    return nomesEixo.get(chave) || chave;
  }

  /* --------------------------------------------------------------- alavancas */

  function montarAlavancas(eixos, estado) {
    const lista = refs.alavancas;
    lista.replaceChildren();
    alavancas.clear();
    eixos.forEach((eixo) => {
      const item = elemento('li', 'jogo-alavanca__item');
      const botao = elemento('button', 'jogo-alavanca');
      botao.type = 'button';
      botao.dataset.eixo = eixo.chave;

      const nome = elemento('span', 'jogo-alavanca__nome', eixo.nome);
      const pips = elemento('span', 'jogo-alavanca__pips');
      pips.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 4; i += 1) {
        const pip = elemento('span', 'jogo-pip');
        pips.append(pip);
      }
      const alvo = elemento('span', 'jogo-alavanca__alvo');

      botao.append(nome, pips, alvo);
      item.append(botao);
      lista.append(item);
      alavancas.set(eixo.chave, { botao, pips, alvo });
    });
    if (estado) pintarAlavancas(estado);
  }

  function pintarAlavancas(estado) {
    const verbo = verboDaEtapa(estado.lote.etapa);
    EIXOS.forEach((eixo) => {
      const registro = alavancas.get(eixo);
      if (!registro) return;
      const valor = valorDe(estado, eixo);
      const alvo = alvoDe(estado.lote, eixo);
      const revelado = Boolean(estado.revelados[eixo]);
      const filhos = registro.pips.children;
      for (let i = 0; i < filhos.length; i += 1) {
        filhos[i].dataset.cheio = i < valor ? '1' : '0';
        filhos[i].dataset.alvo = i < alvo ? '1' : '0';
      }
      registro.alvo.textContent = revelado ? 'alvo ' + alvo : 'não lido';
      registro.alvo.dataset.estado = revelado ? (valor === alvo ? 'alcancado' : 'pendente') : 'oculto';
      registro.botao.dataset.selecionado = eixo === EIXOS[estado.eixoSelecionado] ? '1' : '0';
      registro.botao.classList.toggle('is-alcancado', revelado && valor === alvo);
      registro.botao.classList.toggle('is-oculto', !revelado);
      const leitura = revelado
        ? 'alvo ' + alvo + ', atual ' + valor
        : 'valor não lido, golpe para ler a matriz';
      registro.botao.setAttribute(
        'aria-label',
        nomeDoEixo(eixo) + ' — ' + leitura + '. ' + verbo.charAt(0).toUpperCase() + verbo.slice(1) + ' este eixo.',
      );
      registro.botao.dataset.tratamento = tratamentosEixo.get(eixo) || '';
    });
  }

  /* -------------------------------------------------------------------- HUD */

  function pintarHud(estado) {
    const etapa = ETAPAS[estado.lote.etapa] || { roman: '', nome: estado.lote.etapa };
    refs.etapaRomano.textContent = etapa.roman;
    refs.etapaNome.textContent = etapa.nome;
    refs.loteTitulo.textContent = tituloCurto(estado.lote.titulo);
    refs.loteMeta.textContent = [
      estado.lote.year ? String(estado.lote.year) : null,
      estado.lote.pais,
      estado.lote.suporte,
    ].filter(Boolean).join(' · ');
    refs.tempo.textContent = tempoTexto(estado.tempoRestante);
    refs.tempo.dataset.critico = estado.tempoRestante <= 15 ? '1' : '0';
    refs.carimbos.textContent = String(estado.carimbosRestantes);
    refs.carimbos.dataset.zerado = estado.carimbosRestantes <= 0 ? '1' : '0';
    refs.eixosNoAlvo.textContent = eixosNoAlvo(estado) + '/' + EIXOS.length;
    refs.combo.textContent = estado.combo > 0 ? '×' + estado.combo : '—';
    // Durante a fundição, o placar mostra o que já foi cunhado; só depois da
    // cunhagem ele passa a contar os bônus.
    const fundido = estado.fase === FASES.DOSSIER || estado.fase === FASES.CASTING;
    refs.pontos.textContent = String(fundido ? estado.pontos : estado.pontosPorEixo);
  }

  /* ---------------------------------------------------------------- platina */

  function pintarPlaten(estado) {
    const platen = refs.platen;
    EIXOS.forEach((eixo) => {
      platen.setAttribute('data-t-' + eixo, String(valorDe(estado, eixo)));
    });
    platen.setAttribute('data-etapa', estado.lote.etapa);
    const aplicados = EIXOS.filter((eixo) => valorDe(estado, eixo) > 0);
    const lista = aplicados.map((eixo) => nomeDoEixo(eixo));
    const descricao = lista.length
      ? lista.join(', ')
      : 'nenhum tratamento aplicado ainda';
    const imagens = platen.querySelectorAll('img');
    imagens.forEach((imagem) => {
      imagem.setAttribute(
        'alt',
        estado.lote.titulo + ' (' + (estado.lote.year || 's/data') + '). Tratamentos aplicados: ' + descricao + '.',
      );
    });
    refs.platenLegenda.textContent = estado.imagemIndisponivel
      ? 'Reprodução indisponível — consulte o arquivo de origem: ' + estado.lote.fonte_url
      : descricao;
  }

  /* -------------------------------------------------------------- orientações */

  function pintarMatrizNota(estado) {
    const contra = ehContraAlegoria(estado.lote);
    if (contra) {
      refs.matrizNota.textContent =
        'O Estado pede o emblema pleno. A matriz pede o perfil real do objeto: cada recusa devolve um eixo à vida. Golpeie para recusar.';
      return;
    }
    if (estado.cota >= EIXOS.length) {
      refs.matrizNota.textContent =
        'A matriz está inteira à vista. Cada golpe sobe um degrau e leva um carimbo.';
      return;
    }
    refs.matrizNota.textContent =
      'Matriz parcial: ' + estado.cota + ' de ' + EIXOS.length +
      ' eixos lidos. Golpeie uma alavanca de valor desconhecido para lê-la — a leitura custa ' +
      estado.custoLeitura + ' segundos do relógio.';
  }

  function pintarRodape(estado) {
    const usados = estado.carimbosUsados;
    const total = estado.lote.carimbos;
    refs.matrizRodape.textContent =
      usados + ' de ' + total + ' carimbos usados · ' + eixosNoAlvo(estado) + ' de ' +
      EIXOS.length + ' eixos no alvo';
  }

  /* -------------------------------------------------------------- dossiê */

  function linhaDeDado(rotulo, valor) {
    const linha = elemento('div', 'jogo-dossie__dado');
    linha.append(elemento('dt', null, rotulo), elemento('dd', null, valor));
    return linha;
  }

  function pintarDossie(estado) {
    const lote = estado.lote;
    const corpo = refs.dossieCorpo;
    corpo.replaceChildren();

    const cabecalho = elemento('header', 'jogo-dossie__cabecalho');
    cabecalho.append(elemento('p', 'jogo-dossie__etapa', (ETAPAS[lote.etapa] || {}).nome || lote.etapa));
    cabecalho.append(elemento('h2', 'jogo-dossie__titulo', lote.titulo));
    cabecalho.append(
      elemento(
        'p',
        'jogo-dossie__meta',
        [lote.year ? String(lote.year) : null, lote.pais, lote.suporte, lote.regime]
          .filter(Boolean).join(' · '),
      ),
    );
    corpo.append(cabecalho);

    if (lote.nota_escopo) {
      const nota = elemento('p', 'jogo-dossie__escopo', lote.nota_escopo);
      corpo.append(nota);
    }
    if (lote.descricao) {
      corpo.append(elemento('p', 'jogo-dossie__descricao', lote.descricao));
    }

    const matriz = elemento('section', 'jogo-dossie__secao');
    matriz.append(elemento('h3', null, 'Matriz do objeto'));
    const lista = elemento('ul', 'jogo-dossie__eixos');
    EIXOS.forEach((eixo) => {
      const item = elemento('li', 'jogo-dossie__eixo');
      const valor = alvoDe(lote, eixo);
      item.append(
        elemento('span', 'jogo-dossie__eixo-nome', nomeDoEixo(eixo)),
        elemento('span', 'jogo-dossie__eixo-valor', String(valor)),
      );
      lista.append(item);
    });
    matriz.append(lista);
    matriz.append(
      elemento(
        'p',
        'jogo-dossie__legenda',
        'Os escores são atos interpretativos situados, não dados neutros. Cada valor é a leitura de uma pessoa, numa data, sobre um objeto — e não uma medida.',
      ),
    );
    corpo.append(matriz);

    const fundicao = elemento('section', 'jogo-dossie__secao');
    fundicao.append(elemento('h3', null, 'Fundição'));
    const dl = elemento('dl', 'jogo-dossie__dados');
    dl.append(linhaDeDado('Pontos por eixo', String(estado.pontosPorEixo)));
    dl.append(linhaDeDado('Bônus de tempo', String(estado.bonusTempo)));
    dl.append(linhaDeDado(
      estado.bonusPrecisao > 0 ? 'Fundição precisa (nenhum carimbo desperdiçado)' : 'Fundição precisa (não alcançada)',
      String(estado.bonusPrecisao),
    ));
    dl.append(linhaDeDado('Pontos de cunhagem', String(estado.pontos)));
    dl.append(linhaDeDado('Carimbos usados', estado.carimbosUsados + ' de ' + lote.carimbos));
    dl.append(linhaDeDado('Melhor combo', '×' + estado.melhorCombo));
    fundicao.append(dl);
    corpo.append(fundicao);

    const fonte = elemento('section', 'jogo-dossie__secao');
    fonte.append(elemento('h3', null, 'Fonte'));
    if (lote.citacao) fonte.append(elemento('p', 'jogo-dossie__citacao', lote.citacao));
    if (lote.fonte_url) {
      const link = elemento('a', 'jogo-dossie__link', lote.fonte_url);
      link.href = lote.fonte_url;
      link.target = '_blank';
      link.rel = 'noopener';
      fonte.append(link);
    }
    if (lote.direitos) fonte.append(elemento('p', 'jogo-dossie__direitos', 'Direitos: ' + lote.direitos));
    corpo.append(fonte);

    const codificacao = elemento('section', 'jogo-dossie__secao');
    codificacao.append(elemento('h3', null, 'Codificação'));
    const cod = elemento('dl', 'jogo-dossie__dados');
    cod.append(linhaDeDado('Codificador', lote.codificacao.coded_by || '—'));
    cod.append(linhaDeDado('Data', lote.codificacao.coded_at || '—'));
    if (lote.codificacao.regime_justificativa) {
      cod.append(linhaDeDado('Justificativa do regime', lote.codificacao.regime_justificativa));
    }
    if (lote.codificacao.notas) cod.append(linhaDeDado('Notas', lote.codificacao.notas));
    codificacao.append(cod);
    corpo.append(codificacao);
  }

  /* ------------------------------------------------------------ linha do tempo */

  function pintarLinhaTempo(grupos, progresso) {
    const lista = refs.mapaLista;
    lista.replaceChildren();
    grupos.forEach((grupo) => {
      const etapa = ETAPAS[grupo.etapa] || { roman: '', nome: grupo.etapa };
      const bloco = elemento('li', 'jogo-linha__etapa');
      bloco.append(elemento('h3', 'jogo-linha__etapa-titulo', etapa.roman + ' · ' + etapa.nome));
      const itens = elemento('ol', 'jogo-linha__lotes');
      grupo.lotes.forEach((lote) => {
        const item = elemento('li');
        const botao = elemento('button', 'jogo-linha__lote');
        botao.type = 'button';
        botao.dataset.lote = lote.id;
        const feito = Boolean(progresso.concluidos[lote.id]);
        const liberado = progresso.liberados[lote.id];
        botao.dataset.estado = feito ? 'feito' : liberado ? 'livre' : 'travado';
        botao.disabled = !liberado;
        botao.append(elemento('span', 'jogo-linha__ano', lote.year ? String(lote.year) : '—'));
        botao.append(elemento('span', 'jogo-linha__titulo', lote.titulo));
        botao.append(
          elemento(
            'span',
            'jogo-linha__estado',
            feito ? 'cunhado' : liberado ? 'disponível' : 'travado',
          ),
        );
        item.append(botao);
        itens.append(item);
      });
      bloco.append(itens);
      lista.append(bloco);
    });
  }

  /* ------------------------------------------------------------------ aviso */

  function mostrarAviso(estado, tipo) {
    const painel = refs.overlay;
    painel.replaceChildren();
    painel.hidden = false;
    const caixa = elemento('div', 'jogo-aviso');
    if (tipo === 'falha') {
      const motivo = estado.motivoFalha === 'sem-carimbos'
        ? 'Os carimbos acabaram antes da matriz.'
        : 'O relógio da fundição zerou.';
      caixa.append(elemento('h2', 'jogo-aviso__titulo', 'Fundição imperfeita'));
      caixa.append(elemento('p', 'jogo-aviso__texto', motivo + ' O lote volta intacto; nenhum ponto é guardado.'));
      const acao = elemento('button', 'btn btn-primary jogo-aviso__acao', 'REPETIR O LOTE');
      acao.type = 'button';
      acao.dataset.acao = 'repetir';
      caixa.append(acao);
    } else {
      const etapa = ETAPAS[estado.lote.etapa] || { roman: '', nome: estado.lote.etapa };
      caixa.append(elemento('p', 'jogo-aviso__etapa', 'Etapa ' + etapa.roman + ' · ' + etapa.nome));
      caixa.append(elemento('h2', 'jogo-aviso__titulo', estado.lote.titulo));
      caixa.append(
        elemento(
          'p',
          'jogo-aviso__texto',
          [estado.lote.year ? String(estado.lote.year) : null, estado.lote.pais, estado.lote.suporte]
            .filter(Boolean).join(' · '),
        ),
      );
      caixa.append(
        elemento(
          'p',
          'jogo-aviso__texto',
          'A prensa espera a matriz. ' + estado.lote.carimbos + ' carimbos, ' +
            estado.lote.segundos + ' segundos de fundição.',
        ),
      );
      const acao = elemento('button', 'btn btn-primary jogo-aviso__acao', 'COMEÇAR A FUNDIÇÃO');
      acao.type = 'button';
      acao.dataset.acao = 'comecar';
      caixa.append(acao);
    }
    painel.append(caixa);
    const botao = caixa.querySelector('button');
    if (botao) botao.focus();
  }

  function esconderAviso() {
    refs.overlay.replaceChildren();
    refs.overlay.hidden = true;
  }

  /* ------------------------------------------------------------------- api */

  return {
    registrarEixos,
    montarAlavancas,
    pintarAlavancas,
    pintarHud,
    pintarPlaten,
    pintarMatrizNota,
    pintarRodape,
    pintarDossie,
    pintarLinhaTempo,
    mostrarAviso,
    esconderAviso,
    tempoTexto,
  };
}
