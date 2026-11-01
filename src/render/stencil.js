import { blueLight, grey } from "./palette.js";
import { dot } from "./pixels.js";

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

// Что выбито на табличке: id, а если его нет — первый класс.
export const plateText = (thing) => {
  if (!thing?.present) return null;
  if (thing.id) return `#${thing.id}`;

  const [first] = thing.className.split(/\s+/).filter(Boolean);
  return first ? `.${first}` : null;
};

// Текст по центру площадки на стене. Табличка горит светло-синим, когда
// к вещи тянется провод из кода: значит, селектор её нашёл.
export const drawPlate = (ctx, plate, text, lit) => {
  if (!text) return;

  const { pixels, left, top, width, height } = rasterize(text);
  const x = plate.x + Math.floor((plate.w - width) / 2) - left;
  const y = plate.y + Math.floor((plate.h - height) / 2) - top;
  const color = lit ? blueLight : grey[4];
  pixels.forEach(([px, py]) => dot(ctx, color, x + px, y + py));
};
