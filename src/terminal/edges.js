import { blue, blueGlow, blueLight } from "../render/palette.js";
import { dot } from "../render/pixels.js";

// Кромка слева от номеров строк (MECHANICS.md §3.2): синяя — инструкция
// начала выполняться, светлая — по её звену сейчас бежит импульс или
// строка обработчика вспыхнула на событии, пунктир — тело функции, оно
// ждёт вызова. Строка, до которой код не дошёл, остаётся тёмной.
export const drawEdges = (ctx, { trace }, view, boxOf) => {
  const { lines, bright, flashes } = view;
  const all = new Set([...lines.keys(), ...flashes.keys()]);
  all.forEach((line) => {
    const kind = lines.get(line);
    const box = boxOf(line);
    if (!box) return;

    const top = Math.max(trace.y, Math.round(box.top));
    const bottom = Math.min(
      trace.y + trace.h,
      Math.round(box.top + box.height) - 1,
    );
    const color =
      bright.has(line) || flashes.has(line)
        ? blueLight
        : kind === `lit`
          ? blue
          : null;

    for (let y = top; y < bottom; y++) {
      if (color) dot(ctx, color, trace.x, y);
      else if (y % 2 === 0) dot(ctx, blueGlow, trace.x, y);
    }
  });
};
