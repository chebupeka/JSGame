import { blue, blueGlow, blueLight } from "./palette.js";
import { dot, isLit } from "./pixels.js";

// Свет, который сделал код игрока, — только синий. Сила света 0…1 сводится
// к трём синим ступеням с растром Байера: где свет слабый, по полу редкие
// точки отсвета, ближе к лампе — сплошной синий. Где света нет, пол
// остаётся как был.
const STEPS = [null, blueGlow, blue, blueLight];

const colorAt = (strength, x, y) => {
  const level = Math.min(strength, 0.999) * (STEPS.length - 1);
  const low = Math.floor(level);
  return isLit(x, y, level - low) ? STEPS[low + 1] : STEPS[low];
};

// Расстояние от точки до отрезка ab.
const toSegment = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

// Пятно лампы на полу: яркое под лампой и сплошной дорожкой от белой
// полосы до порога двери. Она ходит только по свету, поэтому путь освещён
// целиком.
export const drawLampLight = (ctx, { lamp, path, floor }) => {
  const [cx, cy] = lamp;

  for (let y = floor.top; y < floor.bottom; y++) {
    for (let x = 0; x < 320; x++) {
      const pool = 1 - Math.hypot((x - cx) / 46, (y - cy) / 11);
      const road = 0.55 * (1 - toSegment(x, y, ...path) / 9);
      const strength = Math.max(pool, road);
      if (strength <= 0) continue;

      const color = colorAt(strength, x, y);
      if (color) dot(ctx, color, x, y);
    }
  }
};
