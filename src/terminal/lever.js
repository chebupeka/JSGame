import { blue, grey } from "../render/palette.js";
import { dot, rect } from "../render/pixels.js";

// Рубильник — видимый двойник Ctrl+Enter: щелчок по нему запускает код.
// Три кадра (tools/draw_controls.py): разомкнут, на полпути, замкнут.
// SyntaxError: рубильник не встаёт в зацеп и отскакивает через «на полпути».
const BOUNCE = 160;

export const leverFrame = ({ closed, bounced }, time) => {
  if (bounced !== null && time - bounced < BOUNCE) return 1;
  return closed ? 2 : 0;
};

const drawCodeLever = (ctx, { x, y, w, h }, frame) => {
  rect(ctx, grey[0], x, y, w, h);
  rect(ctx, grey[2], x + 1, y + 1, w - 2, h - 2);
  rect(ctx, grey[0], x + 7, y + 4, 2, h - 8);

  const handle = [y + 3, y + 12, y + h - 11][frame];
  rect(ctx, grey[4], x + 3, handle, w - 6, 3);
};

export const drawLever = (ctx, place, lever, time, sheet) => {
  const frame = leverFrame(lever, time);
  if (!sheet) return drawCodeLever(ctx, place, frame);

  const { x, y, w, h } = place;
  ctx.drawImage(sheet, frame * w, 0, w, h, x, y, w, h);
};

// Автомат: ошибка при выполнении его выбивает, следующий запуск взводит.
// Два кадра: взведён, выбит.
export const drawBreaker = (ctx, { x, y, w, h }, tripped, sheet) => {
  if (!sheet) return;
  ctx.drawImage(sheet, tripped ? w : 0, 0, w, h, x, y, w, h);
};

// Тумблер под рубильником — видимый двойник сочетания клавиш: медленный
// повтор (Shift+Ctrl+Enter) и «выровнять» (Shift+Alt+F). Пока он делает
// своё дело, он опущен и горит.
export const drawToggle = (ctx, { x, y, w, h }, active) => {
  rect(ctx, grey[0], x, y, w, h);
  rect(ctx, grey[2], x + 1, y + 1, w - 2, h - 2);

  const handle = active ? y + h - 3 : y + 1;
  rect(ctx, grey[4], x + 3, handle, w - 6, 2);
  if (active) dot(ctx, blue, x + Math.floor(w / 2), handle);
};

export const isInside = ({ x, y, w, h }, point) =>
  point.x >= x && point.x < x + w && point.y >= y && point.y < y + h;
