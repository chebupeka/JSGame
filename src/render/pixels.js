export const rect = (ctx, color, x, y, w, h) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

export const dot = (ctx, color, x, y) => rect(ctx, color, x, y, 1, 1);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Растр Байера 4×4 привязан к сетке сцены, поэтому узоры соседних вещей
// стыкуются. Порог клетки (k + 0,5) / 16: доля 0,5 зажигает ровно 8 из 16.
// Плотность несёт смысл: 0.25 — задумано, 0.5 — ждёт, 1 — ток.
export const isLit = (x, y, density) =>
  (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16 < density;

// Строка за строкой: rows(y) возвращает [от, до) по x или null.
export const ditherShape = (ctx, color, top, bottom, rows, density) => {
  for (let y = top; y < bottom; y++) {
    const span = rows(y);
    if (!span) continue;

    for (let x = Math.round(span[0]); x < Math.round(span[1]); x++) {
      if (isLit(x, y, density)) dot(ctx, color, x, y);
    }
  }
};

// Растр одной плотности на весь прямоугольник — одним fillRect. Узор 4×4
// тот же, что у isLit, и так же привязан к сетке сцены (узор холста
// начинается в её углу).
const patterns = new Map();

export const ditherFill = (ctx, color, density, x, y, w, h) => {
  const lit = Math.min(16, Math.ceil(density * 16 - 0.5));
  if (lit <= 0) return;

  const id = `${color} ${lit}`;
  if (!patterns.has(id)) {
    const tile = document.createElement(`canvas`);
    tile.width = 4;
    tile.height = 4;
    const tileCtx = tile.getContext(`2d`);
    for (let ty = 0; ty < 4; ty++) {
      for (let tx = 0; tx < 4; tx++) {
        if (isLit(tx, ty, lit / 16)) dot(tileCtx, color, tx, ty);
      }
    }
    patterns.set(id, ctx.createPattern(tile, `repeat`));
  }

  rect(ctx, patterns.get(id), x, y, w, h);
};
