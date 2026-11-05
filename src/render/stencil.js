import { blueLight, grey } from "./palette.js";
import { dot, rect } from "./pixels.js";

// Таблички на вещах: настоящий id (`#lamp`) или класс (`.frame`) из DOM
// песочницы, выбитые пиксельным шрифтом Tiny5 (OFL). Буквы строчные, как
// в коде: селекторы чувствительны к регистру, и табличка не должна врать.
//
// У Tiny5 одна точка шрифта — 1/8 em. Рисуем текст в 10 раз крупнее
// и берём каждую клетку по центру: никаких полутонов, ровно пиксели шрифта.
const UNIT = 10;
const ASCENT = 7;
const DESCENT = 2;
export const STENCIL_FONT = `${UNIT * 8}px Tiny5`;

const cache = new Map();

const rasterize = (text) => {
  if (cache.has(text)) return cache.get(text);
  // Текст на табло бывает новый на каждое событие: памяти это не стоит.
  if (cache.size > 200) cache.clear();

  const canvas = document.createElement(`canvas`);
  const ctx = canvas.getContext(`2d`, { willReadFrequently: true });
  ctx.font = STENCIL_FONT;
  const columns = Math.ceil(ctx.measureText(text).width / UNIT);
  const rows = ASCENT + DESCENT;
  canvas.width = Math.max(1, columns * UNIT);
  canvas.height = rows * UNIT;

  ctx.font = STENCIL_FONT;
  ctx.textBaseline = `alphabetic`;
  ctx.fillStyle = `#ffffff`;
  ctx.fillText(text, 0, ASCENT * UNIT);
  const alpha = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const pixels = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const center =
        ((y * UNIT + UNIT / 2) * canvas.width + x * UNIT + UNIT / 2) * 4;
      if (alpha[center + 3] > 127) pixels.push([x, y]);
    }
  }

  const xs = pixels.map(([x]) => x);
  const ys = pixels.map(([, y]) => y);
  const bitmap = {
    pixels,
    left: Math.min(...xs),
    top: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
  };
  cache.set(text, bitmap);
  return bitmap;
};

// Что выбито на табличке: id, а если его нет — класс. У вещи с общим первым
// классом манифест называет свой (preferred), пока он у неё есть.
export const plateText = (thing, preferred) => {
  if (!thing?.present) return null;
  if (thing.id) return `#${thing.id}`;

  const classes = thing.className.split(/\s+/).filter(Boolean);
  if (preferred && classes.includes(preferred)) return `.${preferred}`;
  return classes[0] ? `.${classes[0]}` : null;
};

// Текст по центру площадки. С clip шире площадки не бывает: лишнее срезается
// справа, как overflow у настоящей вещи.
export const drawStencil = (ctx, box, text, color, clip = false) => {
  const { x: boxX, y: boxY } = box;
  const boxW = box.w ?? box.width;
  const boxH = box.h ?? box.height;
  const { pixels, left, top, width, height } = rasterize(text);
  if (!pixels.length) return;

  const inset = Math.floor((boxW - width) / 2);
  const x = boxX + (clip ? Math.max(1, inset) : inset) - left;
  const y = boxY + Math.floor((boxH - height) / 2) - top;
  pixels.forEach(([px, py]) => {
    if (!clip || x + px < boxX + boxW) dot(ctx, color, x + px, y + py);
  });
};

// Текст в несколько строк: не влез в ширину — перенос по словам, как в
// настоящей вещи. Строки считает рендер, высоту строки держит шрифт.
const LINE = 7;

export const stencilLines = (text, width) => {
  const lines = [];
  text
    .trim()
    .split(/\s+/)
    .forEach((word) => {
      const last = lines.at(-1);
      const joined = last === undefined ? word : `${last} ${word}`;
      if (last === undefined || rasterize(joined).width > width - 2) {
        lines.push(word);
      } else {
        lines[lines.length - 1] = joined;
      }
    });
  return lines;
};

export const drawWrapped = (ctx, box, text, color) => {
  const width = box.w ?? box.width;
  const height = box.h ?? box.height;
  const lines = stencilLines(text, width).slice(
    0,
    Math.max(1, Math.floor(height / LINE)),
  );
  const top = box.y + Math.floor((height - lines.length * LINE) / 2);
  lines.forEach((line, index) =>
    drawStencil(
      ctx,
      { x: box.x, y: top + index * LINE, w: width, h: LINE },
      line,
      color,
      true,
    ),
  );
};

// Табличка горит светло-синим, когда селектор в коде её нашёл. Площадка
// со slot — со своей тёмной подложкой.
export const drawPlate = (ctx, plate, text, lit) => {
  if (!text) return;

  if (plate.slot) rect(ctx, grey[1], plate.x, plate.y, plate.w, plate.h);
  drawStencil(ctx, plate, text, lit ? blueLight : grey[4]);
};
