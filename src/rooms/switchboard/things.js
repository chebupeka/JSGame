import { blue, blueGlow, blueLight, grey } from "../../render/palette.js";
import { drawGlass } from "../../render/glass.js";
import { rect } from "../../render/pixels.js";
import { drawStencil } from "../../render/stencil.js";

export const hasClass = (thing, name) =>
  thing?.present ? thing.className.split(/\s+/).includes(name) : false;

// Рамка 0×0 — вещь спрятали (`display: none`) или песочница ещё не получила
// размер: рисовать нечего.
const visible = (thing) => thing?.present && thing.rect.width >= 1;

// Лампа — спрайт от Codex, два кадра одним листом: выключена | горит.
// Место и размер — из настоящей вёрстки в песочнице, кадр — из класса `on`.
const drawLamp = (ctx, lamp, sheet) => {
  if (!visible(lamp) || lamp.rect.height < 1 || !sheet) return;

  const { x, y } = lamp.rect;
  const frame = hasClass(lamp, `on`) ? 1 : 0;
  ctx.drawImage(
    sheet,
    frame * 14,
    0,
    14,
    20,
    Math.round(x),
    Math.round(y),
    14,
    20,
  );
};

// Лампа в проёме — маленький плафон на косяке. Правило «горит» то же.
const drawDoorLamp = (ctx, lamp) => {
  if (!visible(lamp)) return;
  const { x, y, width, height } = lamp.rect;
  const on = hasClass(lamp, `on`);
  rect(ctx, grey[1], x, y, width, height);
  rect(ctx, on ? blue : grey[3], x + 1, y + 1, width - 2, height - 2);
  if (on) rect(ctx, blueLight, x + 2, y + 2, width - 4, height - 4);
};

// Табло над дверью. Пустое тёмное; текст положил твой код — экран синий,
// на нём светло-синие буквы. Что не влезло, срезается: overflow в CSS.
const drawBoard = (ctx, board) => {
  if (!visible(board)) return;
  const { x, y, width, height } = board.rect;
  const text = board.text ?? ``;
  rect(ctx, grey[0], x - 1, y - 1, width + 2, height + 2);
  rect(ctx, text ? blueGlow : grey[1], x, y, width, height);
  if (text) drawStencil(ctx, board.rect, text, blueLight, true);
};

// Плафон в глубине тамбура: его свет — только цвет фона, который дал код.
const drawPlafond = (ctx, plafond, level) => {
  if (!visible(plafond)) return;
  const { x, y, width, height } = plafond.rect;
  rect(ctx, grey[2], x, y - 1, width, 1);
  rect(ctx, grey[1], x, y, width, height);
  if (level !== null && level !== undefined) {
    drawGlass(ctx, plafond.rect, Math.max(level, 1 / 8));
  }
};

export const drawSwitchboardThings = (ctx, things, sprites, glow) => {
  drawLamp(ctx, things?.lamp, sprites?.lamp);
  drawPlafond(ctx, things?.plafond, glow.plafond);
  drawDoorLamp(ctx, things?.doorLamp);
  drawBoard(ctx, things?.board);
};
