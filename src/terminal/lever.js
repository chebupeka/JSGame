import { grey } from "../render/palette.js";
import { rect } from "../render/pixels.js";

// Рубильник-заглушка: 2 кадра. Видимый двойник Ctrl+Enter — щелчок по нему
// запускает код. Разомкнут — питания нет, замкнут — код запущен.
export const drawLever = (ctx, { x, y, w, h }, closed) => {
  rect(ctx, grey[0], x, y, w, h);
  rect(ctx, grey[2], x + 1, y + 1, w - 2, h - 2);
  rect(ctx, grey[0], x + 7, y + 4, 2, h - 8);

  const handle = closed ? y + h - 11 : y + 3;
  rect(ctx, grey[4], x + 3, handle, w - 6, 3);
  rect(ctx, grey[3], x + 7, closed ? handle - 5 : handle + 3, 2, 5);
};

export const isInside = ({ x, y, w, h }, point) =>
  point.x >= x && point.x < x + w && point.y >= y && point.y < y + h;
