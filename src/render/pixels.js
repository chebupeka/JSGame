export const rect = (ctx, color, x, y, w, h) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

export const dot = (ctx, color, x, y) => rect(ctx, color, x, y, 1, 1);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Растр Байера 4×4 привязан к сетке сцены, поэтому узоры соседних вещей
// стыкуются. Плотность несёт смысл: 0.25 — задумано, 0.5 — ждёт, 1 — ток.
export const isLit = (x, y, density) =>
  BAYER[(y % 4) * 4 + (x % 4)] < density * 16;

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
