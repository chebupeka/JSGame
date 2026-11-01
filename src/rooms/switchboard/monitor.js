import { blue, blueLight } from "../../render/palette.js";
import { rect } from "../../render/pixels.js";

// Монитор на стене: решённый файл работает на нём всегда. Экран синий —
// живой, на нём твои строки силуэтом из чёрточек: длина чёрточки — длина
// строки, отступ — отступ. Комментарии и пустые строки не рисуются.
export const drawMonitor = (ctx, screen, code) => {
  if (!code) return;

  rect(ctx, blue, screen.x, screen.y, screen.w, screen.h);

  const lines = code
    .split(`\n`)
    .filter((line) => line.trim() && !line.trim().startsWith(`//`));
  const rows = Math.floor((screen.h - 2) / 2);

  lines.slice(0, rows).forEach((line, index) => {
    const indent = Math.min(4, Math.floor(line.search(/\S/) / 2));
    const length = Math.max(2, Math.round(line.trim().length / 3));
    rect(
      ctx,
      blueLight,
      screen.x + 1 + indent,
      screen.y + 1 + index * 2,
      Math.min(length, screen.w - 2 - indent),
      1,
    );
  });
};
