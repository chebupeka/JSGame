import { SOUNDS } from "./table.js";
import { VOICES, noiseBuffer } from "./voices.js";

// Звук станции. Браузер не даёт звучать до первого действия игрока,
// поэтому всё начинается с первой клавиши или щелчка. Подпись звука
// уходит на кромку корпуса, если подписи включены, — даже без звука.
const AMBIENCE = [`sea`, `hum`, `wind`];

export const createSound = ({ settings, onCaption }) => {
  let audio = null;

  // Звуки одного мгновения (клац рубильника и гул) — одной строкой.
  let pending = [];
  const caption = (ids) => {
    if (!settings.captions) return;
    if (!pending.length) {
      queueMicrotask(() => {
        onCaption(pending.map((id) => SOUNDS[id].caption).join(`, `));
        pending = [];
      });
    }
    pending.push(...ids.filter((id) => !pending.includes(id)));
  };

  const apply = () => {
    if (!audio) return;
    const volume = settings.sound ? settings.volume : 0;
    audio.out.gain.setTargetAtTime(volume, audio.ctx.currentTime, 0.05);
  };

  const start = () => {
    if (audio) return;

    const ctx = new AudioContext();
    const out = ctx.createGain();
    out.gain.value = 0;
    // Страховка от перегрузки, если звуки наложатся.
    out.connect(ctx.createDynamicsCompressor()).connect(ctx.destination);
    audio = { ctx, out, noise: noiseBuffer(ctx), hum: null };

    audio.sea = VOICES.sea(audio);
    audio.hum = VOICES.hum(audio);
    VOICES.wind(audio);
    apply();
    caption(AMBIENCE);
  };

  const play = (id, options = {}) => {
    caption([id]);
    if (!audio || !settings.sound) return;
    VOICES[id](audio, { at: audio.ctx.currentTime, ...options });
  };

  // Шум в комнате — море отступает, тишина — слышнее (MECHANICS.md §4).
  let noisy = null;
  const hush = (next) => {
    if (next === noisy || !audio) return;
    noisy = next;
    audio.sea.gain.setTargetAtTime(
      next ? 0.05 : 0.12,
      audio.ctx.currentTime,
      0.8,
    );
  };

  return { start, play, apply, hush };
};
