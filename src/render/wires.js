import { blue, blueGlow, blueLight } from "./palette.js";
import { dot } from "./pixels.js";

// Точки провода от гнезда терминала к вещи. Провисает, как кабели
// на референсе. Линия ровно в один пиксель: на изгибе «уголок» из трёх
// точек превращается в диагональ, иначе провод местами толще и кажется
// кривым.
export const wirePoints = ([ax, ay], [bx, by]) => {
  const sag = 8 + Math.abs(bx - ax) * 0.12;
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay + sag) * 3) + 1;
  const points = [];

  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = Math.round(ax + (bx - ax) * t);
    const y = Math.round(ay + (by - ay) * t + sag * 4 * t * (1 - t));
    const last = points.at(-1);
    if (last && last[0] === x && last[1] === y) continue;

    const before = points.at(-2);
    const corner =
      before &&
      (before[0] === last[0] || before[1] === last[1]) &&
      (last[0] === x || last[1] === y) &&
      before[0] !== x &&
      before[1] !== y;
    if (corner) points.pop();
    points.push([x, y]);
  }
  return points;
};

// Ровный ритм вдоль провода: из каждых 1 / density точек горит одна.
// Шаг одинаковый по всей длине, поэтому пунктир читается как пунктир.
const evenly = (i, density) =>
  density >= 1 || Math.floor((i + 1) * density) > Math.floor(i * density);

// Провод. Плотность — смысл: 0.25 — задумано (пока печатаешь, редкий
// пунктир), 0.5 — ждёт (точка через точку), 1 — ток (сплошной).
// Прерывистый провод — поиск внутри функции: «буду искать каждый раз,
// когда сработает» — короткими штрихами. upTo — докуда добежал импульс,
// head — его светлая голова.
export const drawWire = (
  ctx,
  from,
  to,
  { density, dashed = false, upTo = 1, head = false, color = blue },
) => {
  const points = wirePoints(from, to);
  const end = Math.round(points.length * upTo);

  points.slice(0, end).forEach(([x, y], i) => {
    if (density <= 0) return;
    const lit = dashed ? i % 5 < 2 : evenly(i, density);
    if (lit) dot(ctx, color, x, y);
  });
  if (head) {
    points
      .slice(Math.max(0, end - 3), end)
      .forEach(([x, y]) => dot(ctx, blueLight, x, y));
  }
};

// Импульс события по кабелю датчика: короткий светлый отрезок, t от 0
// (у начала провода) до 1. На частых событиях — тонкий, в одну точку.
export const drawImpulse = (ctx, from, to, t, { thin = false } = {}) => {
  const points = wirePoints(from, to);
  const at = Math.round((points.length - 1) * t);
  const length = thin ? 1 : 4;
  points
    .slice(Math.max(0, at - length + 1), at + 1)
    .forEach(([x, y]) => dot(ctx, blueLight, x, y));
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
