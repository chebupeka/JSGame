import { blueGlow, blueLight, grey } from "../render/palette.js";
import { rect } from "../render/pixels.js";
import { drawWrapped } from "../render/stencil.js";

// Табло. Правила общие на всю станцию: пустое тёмное; текст положил твой
// код — экран синий, на нём светло-синие буквы. Что не влезло, срезается:
// overflow в CSS.
export const drawBoard = (ctx, board) => {
  if (!board?.present || board.rect.width < 1) return;
  const { x, y, width, height } = board.rect;
  const text = board.text ?? ``;
  rect(ctx, grey[0], x - 1, y - 1, width + 2, height + 2);
  rect(ctx, text ? blueGlow : grey[1], x, y, width, height);
  if (text) drawWrapped(ctx, board.rect, text, blueLight);
};
