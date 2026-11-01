import { blue, grey } from "../render/palette.js";
import { dot, rect } from "../render/pixels.js";

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

// Тумблер медленного повтора под рубильником — видимый двойник
// Shift+Ctrl+Enter. Пока идёт медленный показ, он опущен и горит.
export const drawSlowToggle = (ctx, { x, y, w, h }, active) => {
  rect(ctx, grey[0], x, y, w, h);
  rect(ctx, grey[2], x + 1, y + 1, w - 2, h - 2);

  const handle = active ? y + h - 3 : y + 1;
  rect(ctx, grey[4], x + 3, handle, w - 6, 2);
  if (active) dot(ctx, blue, x + Math.floor(w / 2), handle);
};

export const isInside = ({ x, y, w, h }, point) =>
  point.x >= x && point.x < x + w && point.y >= y && point.y < y + h;
