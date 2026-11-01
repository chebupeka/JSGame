// Голоса станции синтезом, без файлов. Каждый голос — функция от узлов
// станции: { ctx, out, noise, hum }. При импорте ничего не создаётся,
// поэтому таблицу звуков проверяет `node --test`. Громкости скромные:
// это фон, под который думают, а не игровые эффекты.

export const noiseBuffer = (ctx) => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

const filtered = (ctx, type, frequency, q = 1) => {
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  return filter;
};

const gainOf = (ctx, value) => {
  const gain = ctx.createGain();
  gain.gain.value = value;
  return gain;
};

// Медленное колебание параметра вокруг его значения: волны, порывы.
const sway = (ctx, param, frequency, depth) => {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = frequency;
  lfo.connect(gainOf(ctx, depth)).connect(param);
  lfo.start();
};

const loop = ({ ctx, noise }) => {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  source.start(0, Math.random() * 2);
  return source;
};

// Короткий всплеск шума через фильтр: основа щелчков и треска.
const burst = (
  { ctx, noise },
  out,
  { at, length, type, frequency, q = 1, gain },
) => {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(gain, at);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
  source.connect(filtered(ctx, type, frequency, q)).connect(envelope);
  envelope.connect(out);
  source.start(at, Math.random() * 1.5);
  source.stop(at + length + 0.02);
};

// Глухой удар: тон, падающий вниз.
const thump = ({ ctx }, out, { at, from, to, length, gain }) => {
  const tone = ctx.createOscillator();
  tone.frequency.setValueAtTime(from, at);
  tone.frequency.exponentialRampToValueAtTime(to, at + length);
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(gain, at + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
  tone.connect(envelope).connect(out);
  tone.start(at);
  tone.stop(at + length + 0.02);
};

const panned = ({ ctx, out }, pan = 0) => {
  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  panner.connect(out);
  return panner;
};

// Плавно увести параметр к значению, не дёргая то, что уже звучит.
const glide = (param, value, at, time) => {
  param.cancelScheduledValues(at);
  param.setValueAtTime(param.value, at);
  param.setTargetAtTime(value, at, time);
};

export const VOICES = {
  // Море за стеной: шум за низким фильтром, волны — медленные колебания
  // громкости и фильтра.
  sea: (audio) => {
    const { ctx, out } = audio;
    const filter = filtered(ctx, `lowpass`, 520);
    const level = gainOf(ctx, 0.09);
    sway(ctx, level.gain, 0.085, 0.055);
    sway(ctx, filter.frequency, 0.06, 260);
    loop(audio).connect(filter).connect(level).connect(out);
  },

  // Гул станции: сетевые 50 Гц с обертонами. Возвращает свой уровень —
  // его поднимает запуск и обрывает автомат.
  hum: ({ ctx, out }) => {
    const filter = filtered(ctx, `lowpass`, 320);
    const level = gainOf(ctx, 1);
    [
      [50, 0.045, `sine`],
      [100, 0.022, `sine`],
      [150, 0.007, `triangle`],
    ].forEach(([frequency, volume, type]) => {
      const tone = ctx.createOscillator();
      tone.type = type;
      tone.frequency.value = frequency;
      tone.connect(gainOf(ctx, volume)).connect(filter);
      tone.start();
    });
    filter.connect(level).connect(out);
    return level;
  },

  // Ветер под ставнем: узкая полоса шума, тихие порывы.
  wind: (audio) => {
    const { ctx, out } = audio;
    const level = gainOf(ctx, 0.01);
    sway(ctx, level.gain, 0.045, 0.008);
    loop(audio)
      .connect(filtered(ctx, `bandpass`, 1700, 5))
      .connect(level)
      .connect(out);
  },

  // Мягкая клавиша: короткий приглушённый щелчок, каждый чуть другой.
  key: (audio, { at }) => {
    burst(audio, audio.out, {
      at,
      length: 0.03,
      type: `bandpass`,
      frequency: 1800 + Math.random() * 700,
      q: 1.5,
      gain: 0.1,
    });
    thump(audio, audio.out, {
      at,
      from: 160,
      to: 90,
      length: 0.04,
      gain: 0.04,
    });
  },

  // Реле: два сухих щелчка подряд — селектор нашёл вещь.
  relay: (audio, { at, pan }) => {
    const out = panned(audio, pan);
    [0, 0.014].forEach((delay, i) =>
      burst(audio, out, {
        at: at + delay,
        length: 0.008,
        type: `highpass`,
        frequency: 3000,
        gain: i ? 0.1 : 0.16,
      }),
    );
  },

  // Рубильник: тяжёлый клац металла.
  lever: (audio, { at }) => {
    thump(audio, audio.out, {
      at,
      from: 110,
      to: 45,
      length: 0.14,
      gain: 0.22,
    });
    burst(audio, audio.out, {
      at,
      length: 0.04,
      type: `lowpass`,
      frequency: 1600,
      gain: 0.12,
    });
  },

  // Гул нарастает и возвращается к своему уровню.
  rise: ({ hum }, { at }) => {
    if (!hum) return;
    glide(hum.gain, 1.8, at, 0.15);
    hum.gain.setTargetAtTime(1, at + 0.6, 0.35);
  },

  // Треск импульса: россыпь сухих щелчков с той стороны, где он бежит.
  pulse: (audio, { at, pan }) => {
    const out = panned(audio, pan);
    for (let i = 0; i < 9; i++) {
      burst(audio, out, {
        at: at + Math.random() * 0.45,
        length: 0.004 + Math.random() * 0.006,
        type: `highpass`,
        frequency: 2500,
        gain: 0.08 + Math.random() * 0.06,
      });
    }
  },

  // Автомат: тяжёлый удар, гул обрывается до следующего запуска.
  breaker: (audio, { at }) => {
    thump(audio, audio.out, {
      at,
      from: 80,
      to: 32,
      length: 0.22,
      gain: 0.32,
    });
    burst(audio, audio.out, {
      at,
      length: 0.07,
      type: `lowpass`,
      frequency: 900,
      gain: 0.2,
    });
    burst(audio, audio.out, {
      at,
      length: 0.006,
      type: `highpass`,
      frequency: 4000,
      gain: 0.08,
    });
    if (audio.hum) glide(audio.hum.gain, 0, at + 0.02, 0.03);
  },

  // Код занят: гул медленно ползёт вверх.
  strain: ({ hum }, { at }) => {
    if (hum) glide(hum.gain, 2.6, at, 0.6);
  },

  // Сторож: тяжёлый клац, гул пропадает — остаются море и ветер.
  watchdog: (audio, { at }) => {
    thump(audio, audio.out, {
      at,
      from: 95,
      to: 38,
      length: 0.26,
      gain: 0.3,
    });
    burst(audio, audio.out, {
      at,
      length: 0.05,
      type: `lowpass`,
      frequency: 1200,
      gain: 0.18,
    });
    if (audio.hum) glide(audio.hum.gain, 0, at + 0.01, 0.02);
  },

  // Рубильник не встал в зацеп: клац и отскок полегче.
  bounce: (audio, { at }) => {
    [
      [0, 0.18],
      [0.13, 0.08],
    ].forEach(([delay, gain]) =>
      thump(audio, audio.out, {
        at: at + delay,
        from: 120,
        to: 60,
        length: 0.09,
        gain,
      }),
    );
  },
};
