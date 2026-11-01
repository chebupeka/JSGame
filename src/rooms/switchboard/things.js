import { blue, blueLight, grey } from "../../render/palette.js";
import { dot, rect } from "../../render/pixels.js";

export const hasClass = (thing, name) =>
  thing?.present ? thing.className.split(/\s+/).includes(name) : false;

// Лампа-заглушка, пока Codex не нарисовал спрайт (этап 4). Место и размер —
// из настоящей вёрстки в песочнице, кадр — из класса `on`.
const drawLamp = (ctx, lamp) => {
  if (!lamp?.present) return;

  const x = Math.round(lamp.rect.x);
  const y = Math.round(lamp.rect.y);
  const w = Math.round(lamp.rect.width);
  const h = Math.round(lamp.rect.height);
  const on = hasClass(lamp, `on`);

  // Рамка 0×0 — лампу спрятали (`display: none`): рисовать нечего.
  if (w < 5 || h < 6) return;

  rect(ctx, grey[3], x, y, w, 2);
  rect(ctx, grey[2], x + 1, y + 2, w - 2, h - 2);
  rect(ctx, on ? blue : grey[0], x + 2, y + 3, w - 4, h - 5);
  if (on) dot(ctx, blueLight, x + 3, y + 4);
};

export const drawSwitchboardThings = (ctx, things) => {
  drawLamp(ctx, things?.lamp);
};
