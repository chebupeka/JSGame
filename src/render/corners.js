import { dot } from "./pixels.js";

// Уголки вокруг вещи — так игра показывает, какую вещь нашёл код:
// проводов через комнату нет (решение 9 в CLAUDE.md). Цвет — смысл, как
// у всего синего: тусклый — тоже подходит, но querySelector берёт первую
// по разметке; синий — нашлась; светлый — её нашли прямо сейчас.
const ARM = 3;

export const drawCorners = (ctx, { x, y, width, height }, color) => {
  const left = Math.round(x) - 2;
  const top = Math.round(y) - 2;
  const right = Math.round(x + width) + 1;
  const bottom = Math.round(y + height) + 1;
  const arm = Math.max(1, Math.min(ARM, Math.floor((right - left) / 3)));

  [
    [left, top, 1, 1],
    [right, top, -1, 1],
    [left, bottom, 1, -1],
    [right, bottom, -1, -1],
  ].forEach(([cx, cy, dx, dy]) => {
    for (let i = 0; i < arm; i++) {
      dot(ctx, color, cx + dx * i, cy);
      dot(ctx, color, cx, cy + dy * i);
    }
  });
};
