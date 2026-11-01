/*
 * FUNDIÇÃO — camada de efeitos e som.
 *
 * Decoração pura: nada aqui altera a simulação. Sob movimento reduzido, a
 * camada de canvas é desligada por inteiro; o som é sintetizado pela WebAudio,
 * sem nenhum arquivo de áudio publicado, e nasce mudo.
 */

export function criarEfeitos(canvas, opcoes = {}) {
  const contexto = canvas ? canvas.getContext('2d') : null;
  const ondas = [];
  const respingos = [];
  let reduzido = Boolean(opcoes.reduzido);
  let largura = 0;
  let altura = 0;

  function medir() {
    if (!canvas) return;
    const caixa = canvas.getBoundingClientRect();
    const escala = window.devicePixelRatio || 1;
    largura = Math.max(1, Math.round(caixa.width * escala));
    altura = Math.max(1, Math.round(caixa.height * escala));
    canvas.width = largura;
    canvas.height = altura;
    if (contexto) contexto.setTransform(escala, 0, 0, escala, 0, 0);
  }

  function base() {
    const caixa = canvas.getBoundingClientRect();
    return { largura: caixa.width || 1, altura: caixa.height || 1 };
  }

  return {
    definirMovimentoReduzido(valor) {
      reduzido = Boolean(valor);
      if (reduzido) {
        ondas.length = 0;
        respingos.length = 0;
        if (contexto) contexto.clearRect(0, 0, largura, altura);
      }
    },
    estaReduzido() {
      return reduzido;
    },
    medir,
    /** Anel de choque no ponto do golpe. */
    golpe(x, y, forca = 1) {
      if (reduzido || !contexto) return;
      ondas.push({ x, y, r: 4, vida: 1, forca });
      const quantidade = Math.round(6 * forca);
      const medida = base();
      for (let i = 0; i < quantidade; i += 1) {
        const angulo = Math.random() * Math.PI * 2;
        const distancia = 12 + Math.random() * 34 * forca;
        respingos.push({
          x: x + Math.cos(angulo) * distancia,
          y: y + Math.sin(angulo) * distancia,
          vx: Math.cos(angulo) * (40 + Math.random() * 90),
          vy: Math.sin(angulo) * (40 + Math.random() * 90) - 30,
          vida: 1,
          tamanho: 1 + Math.random() * 2.2,
        });
      }
      void medida;
    },
    /** Selo da cunhagem: anéis largos e uma chuva de tinta. */
    cunha(x, y) {
      if (reduzido || !contexto) return;
      for (let i = 0; i < 3; i += 1) {
        ondas.push({ x, y, r: 6 + i * 12, vida: 1, forca: 1.4 });
      }
      for (let i = 0; i < 70; i += 1) {
        const angulo = Math.random() * Math.PI * 2;
        const distancia = Math.random() * 90;
        respingos.push({
          x: x + Math.cos(angulo) * distancia,
          y: y + Math.sin(angulo) * distancia,
          vx: Math.cos(angulo) * (60 + Math.random() * 160),
          vy: Math.sin(angulo) * (60 + Math.random() * 160) - 60,
          vida: 1,
          tamanho: 1 + Math.random() * 3,
        });
      }
    },
    desenhar(dt = 0.016) {
      if (!contexto || reduzido) return;
      const medida = base();
      contexto.clearRect(0, 0, medida.largura, medida.altura);
      for (let i = ondas.length - 1; i >= 0; i -= 1) {
        const onda = ondas[i];
        onda.vida -= dt * 1.6;
        onda.r += dt * 220 * onda.forca;
        if (onda.vida <= 0) {
          ondas.splice(i, 1);
          continue;
        }
        contexto.beginPath();
        contexto.arc(onda.x, onda.y, onda.r, 0, Math.PI * 2);
        contexto.strokeStyle = 'rgba(228, 255, 56, ' + (onda.vida * 0.7).toFixed(3) + ')';
        contexto.lineWidth = 2 + onda.vida * 3;
        contexto.stroke();
      }
      for (let i = respingos.length - 1; i >= 0; i -= 1) {
        const gota = respingos[i];
        gota.vida -= dt * 0.9;
        gota.x += gota.vx * dt;
        gota.y += gota.vy * dt;
        gota.vy += 420 * dt;
        if (gota.vida <= 0) {
          respingos.splice(i, 1);
          continue;
        }
        contexto.fillStyle = 'rgba(228, 255, 56, ' + (gota.vida * 0.85).toFixed(3) + ')';
        contexto.fillRect(gota.x, gota.y, gota.tamanho, gota.tamanho);
      }
    },
    limpar() {
      ondas.length = 0;
      respingos.length = 0;
      if (contexto) contexto.clearRect(0, 0, largura, altura);
    },
  };
}

/**
 * Som da prensa, sintetizado. Nenhum arquivo de áudio é publicado.
 * Nasce mudo; o interruptor é visível no HUD.
 */
export function criarAudio() {
  let contexto = null;
  let mudo = true;

  function pegar() {
    if (!contexto) {
      const Classe = window.AudioContext || window.webkitAudioContext;
      if (!Classe) return null;
      contexto = new Classe();
    }
    if (contexto.state === 'suspended') contexto.resume();
    return contexto;
  }

  function tom(frequencia, duracao, volume, tipo) {
    const audio = pegar();
    if (!audio) return;
    const oscilador = audio.createOscillator();
    const ganho = audio.createGain();
    oscilador.type = tipo || 'sine';
    oscilador.frequency.setValueAtTime(frequencia, audio.currentTime);
    ganho.gain.setValueAtTime(0.0001, audio.currentTime);
    ganho.gain.exponentialRampToValueAtTime(volume, audio.currentTime + 0.008);
    ganho.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duracao);
    oscilador.connect(ganho).connect(audio.destination);
    oscilador.start();
    oscilador.stop(audio.currentTime + duracao + 0.02);
  }

  function ruido(duracao, volume, frequencia) {
    const audio = pegar();
    if (!audio) return;
    const quadros = Math.floor(audio.sampleRate * duracao);
    const buffer = audio.createBuffer(1, quadros, audio.sampleRate);
    const canal = buffer.getChannelData(0);
    for (let i = 0; i < quadros; i += 1) {
      canal[i] = (Math.random() * 2 - 1) * (1 - i / quadros);
    }
    const fonte = audio.createBufferSource();
    const filtro = audio.createBiquadFilter();
    const ganho = audio.createGain();
    filtro.type = 'bandpass';
    filtro.frequency.value = frequencia;
    filtro.Q.value = 1.1;
    ganho.gain.setValueAtTime(volume, audio.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duracao);
    fonte.buffer = buffer;
    fonte.connect(filtro).connect(ganho).connect(audio.destination);
    fonte.start();
  }

  return {
    estaMudo() {
      return mudo;
    },
    alternar() {
      mudo = !mudo;
      if (!mudo) pegar();
      return mudo;
    },
    /** O baque da prensa: ruído filtrado mais um corpo grave. */
    golpe(forca = 1) {
      if (mudo) return;
      ruido(0.14, 0.16 * forca, 1400);
      tom(88 + forca * 14, 0.2, 0.16 * forca, 'triangle');
    },
    /** Leitura da matriz: um bipe curto e macio. */
    leitura() {
      if (mudo) return;
      tom(660, 0.09, 0.07, 'sine');
    },
    /** A catraca do relógio, nos segundos finais. */
    relogio() {
      if (mudo) return;
      tom(1760, 0.04, 0.05, 'square');
    },
    /** A cunhagem: um acorde brilhante. */
    cunha() {
      if (mudo) return;
      [880, 1320, 1760].forEach((frequencia, ordem) => {
        window.setTimeout(() => tom(frequencia, 0.5, 0.09, 'triangle'), ordem * 70);
      });
    },
    /** A recusa da contra-alegoria: um intervalo dissonante que se resolve. */
    recusa() {
      if (mudo) return;
      tom(392, 0.22, 0.09, 'sawtooth');
      window.setTimeout(() => tom(523.25, 0.3, 0.08, 'triangle'), 90);
    },
  };
}
