import { SCENE } from "../screen/scale.js";
import { luminance } from "./ladder.js";
import { blue, blueGlow, blueLight } from "./palette.js";
import { dot, isLit } from "./pixels.js";

// Стекло фальш-окна светит только тем, что сделал код игрока, и только
// синим (MECHANICS.md §4): тёмный цвет — редкие синие точки, светлый —
// сплошной светло-синий, белого нет. Оттенок теряется, яркость остаётся:
// у `red` и `gray` узор один. У любого непрозрачного цвета хотя бы одна
// точка из 16 — окно не выглядит мёртвым.

// Яркость вычисленного background-color, null — света нет (прозрачный).
export const glassLevel = (background) => {
  const values = background?.match(/[\d.]+/g)?.map(Number);
  if (!values || values.length < 3) return null;
  if (values.length > 3 && values[3] === 0) return null;
  return luminance(values.slice(0, 3));
};

// Цвет точки стекла: до половины яркости — синие точки по серому стеклу,
// выше — светло-синие по сплошному синему.
export const glassColor = (level, x, y) => {
  if (level === null) return null;
  if (level <= 0.5)
    return isLit(x, y, Math.max(1 / 16, level * 2)) ? blue : null;
  return isLit(x, y, level * 2 - 1) ? blueLight : blue;
};

// Код может растянуть окно хоть на 5000 пикселей — рисуем только ту
// часть, что в кадре, иначе каждый кадр перебирал бы миллионы точек.
const span = (from, size, limit) => [
  Math.max(0, Math.round(from)),
  Math.min(limit, Math.round(from + size)),
];

export const drawGlass = (ctx, { x, y, width, height }, level) => {
  const [top, bottom] = span(y, height, SCENE.height);
  const [left, right] = span(x, width, SCENE.width);
  for (let py = top; py < bottom; py++) {
    for (let px = left; px < right; px++) {
      const color = glassColor(level, px, py);
      if (color) dot(ctx, color, px, py);
    }
  }
};

// Свет окна на полу — синий параллелограмм, как на референсе: от стены
// к камере, со сдвигом. Чем светлее окно, тем гуще точки.
export const drawWindowLight = (ctx, glass, level, floor) => {
  if (level === null) return;

  const depth = floor.bottom - floor.top;
  for (let y = floor.top; y < floor.bottom; y++) {
    const t = (y - floor.top) / depth;
    const left = Math.max(0, Math.round(glass.x - 4 - t * 22));
    const right = Math.min(
      SCENE.width,
      Math.round(glass.x + glass.width + 4 - t * 10),
    );
    const strength = Math.max(1 / 16, level) * (1 - 0.6 * t);

    for (let x = left; x < right; x++) {
      const color = isLit(x, y, Math.min(1, strength * 2))
        ? strength > 0.5 && isLit(x, y, strength * 2 - 1)
          ? blue
          : blueGlow
        : null;
      if (color) dot(ctx, color, x, y);
    }
  }
};
