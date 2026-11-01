import { blue, blueGlow } from "./palette.js";
import { dot, isLit } from "./pixels.js";

// Провод от гнезда терминала к вещи. Провисает, как кабели на референсе.
// Плотность — растр Байера: 0.25 — задумано (пока печатаешь), 0.5 — ждёт,
// 1 — ток. Прерывистый провод — поиск внутри функции: «буду искать каждый
// раз, когда сработает».
export const drawWire = (ctx, [ax, ay], [bx, by], { density, dashed }) => {
  const sag = 8 + Math.abs(bx - ax) * 0.12;
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2) + 1;
  let previous = null;
  let length = 0;

  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = Math.round(ax + (bx - ax) * t);
    const y = Math.round(ay + (by - ay) * t + sag * 4 * t * (1 - t));
    if (previous === `${x},${y}`) continue;

    previous = `${x},${y}`;
    length += 1;
    if (dashed && Math.floor(length / 3) % 2) continue;
    if (isLit(x, y, density)) dot(ctx, blue, x, y);
  }
};

// Пунктирная обводка вещи, которую селектор тоже находит, но
// `querySelector` берёт только первую по разметке.
export const drawDottedOutline = (ctx, { x, y, width, height }) => {
  const left = Math.round(x) - 1;
  const top = Math.round(y) - 1;
  const right = Math.round(x + width);
  const bottom = Math.round(y + height);

  for (let px = left; px <= right; px += 2) {
    dot(ctx, blueGlow, px, top);
    dot(ctx, blueGlow, px, bottom);
  }
  for (let py = top; py <= bottom; py += 2) {
    dot(ctx, blueGlow, left, py);
    dot(ctx, blueGlow, right, py);
  }
};
