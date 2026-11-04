import { blue, blueGlow, blueLight, grey } from "./palette.js";
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

// Провод — сплошной, как висящие кабели на референсе. Смысл — в яркости
// синего: `ghost` — задумано, пока печатаешь (тусклый), `wait` — ждёт
// (переменная держит вещь, датчик слушает), `live` — по нему идёт ток
// (светлый). Под проводом тень в пиксель — он висит перед стеной.
export const WIRE = { ghost: blueGlow, wait: blue, live: blueLight };

// Прерывистый провод — поиск внутри функции: «буду искать каждый раз,
// когда сработает» — длинными штрихами. upTo — докуда добежал импульс,
// head — его светлая голова.
export const drawWire = (
  ctx,
  from,
  to,
  { tone, dashed = false, upTo = 1, head = false },
) => {
  const color = WIRE[tone];
  if (!color) return;

  const points = wirePoints(from, to);
  const end = Math.round(points.length * upTo);
  const shown = points.slice(0, end).filter((_, i) => !dashed || i % 6 < 4);

  const taken = new Set(shown.map(([x, y]) => `${x},${y}`));
  shown.forEach(([x, y]) => {
    if (!taken.has(`${x},${y + 1}`)) dot(ctx, grey[0], x, y + 1);
  });
  shown.forEach(([x, y]) => dot(ctx, color, x, y));

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

// Уголки вокруг вещи: селектор находит и её, но `querySelector` берёт
// только первую по разметке. Так же щуп показывает вещь под мышью.
const CORNER = 3;

export const drawCorners = (ctx, { x, y, width, height }) => {
  const left = Math.round(x) - 2;
  const top = Math.round(y) - 2;
  const right = Math.round(x + width) + 1;
  const bottom = Math.round(y + height) + 1;
  const arm = Math.max(1, Math.min(CORNER, Math.floor((right - left) / 3)));

  [
    [left, top, 1, 1],
    [right, top, -1, 1],
    [left, bottom, 1, -1],
    [right, bottom, -1, -1],
  ].forEach(([cx, cy, dx, dy]) => {
    for (let i = 0; i < arm; i++) {
      dot(ctx, blueGlow, cx + dx * i, cy);
      dot(ctx, blueGlow, cx, cy + dy * i);
    }
  });
};
