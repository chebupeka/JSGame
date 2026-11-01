import { grey, white } from "../../render/palette.js";
import { dot, rect } from "../../render/pixels.js";

// Временная щитовая кодом, пока Codex не нарисовал фон (этап 9).
// Дальняя стена кончается на y 78, ниже — пол, по которому она ходит.
// Лампа и дверь стоят там же, где в room.css.
export const SWITCHBOARD = {
  door: { x: 34, y: 40, w: 22, h: 38 },
  shutter: { x: 150, y: 14, w: 108, h: 64 },
  slit: 205,
  lamp: { x: 112, y: 33, w: 7, h: 9 },
  floor: { top: 79, bottom: 107 },
};

const { door, shutter, slit } = SWITCHBOARD;

const drawWall = (ctx) => {
  rect(ctx, grey[0], 0, 0, 320, 8);
  rect(ctx, grey[1], 0, 8, 320, 70);
  rect(ctx, grey[2], 0, 19, 320, 2);
  rect(ctx, grey[0], 0, 21, 320, 1);

  for (let x = 6; x < 320; x += 26) rect(ctx, grey[0], x, 22, 1, 56);

  // Сколы краски на стене.
  for (let i = 0; i < 90; i++) {
    dot(ctx, grey[2], (i * 53) % 320, 24 + ((i * 31) % 52));
  }
};

const drawDoor = (ctx) => {
  rect(ctx, grey[2], door.x - 1, door.y - 1, door.w + 2, door.h + 1);
  rect(ctx, grey[0], door.x, door.y, door.w, door.h);
};

// Ставень на морской стене. До финала он закрыт, свет — только из щели.
const drawShutter = (ctx) => {
  rect(
    ctx,
    grey[0],
    shutter.x - 2,
    shutter.y - 2,
    shutter.w + 4,
    shutter.h + 2,
  );
  rect(ctx, grey[2], shutter.x, shutter.y, shutter.w, shutter.h);

  for (let y = shutter.y + 2; y < shutter.y + shutter.h; y += 3) {
    rect(ctx, grey[1], shutter.x, y, shutter.w, 1);
  }
};

const drawFloor = (ctx) => {
  rect(ctx, grey[1], 0, 78, 320, 102);
  rect(ctx, grey[0], 0, 78, 320, 1);

  for (const y of [84, 93, 106, 124, 150]) rect(ctx, grey[0], 0, y, 320, 1);
};

// Дневной свет снаружи: щель в ставне и полоса из неё на полу к камере.
// Рисуется поверх всего в комнате — его не делал игрок, и он есть всегда.
export const drawDaylight = (ctx) => {
  rect(ctx, white, slit, shutter.y, 1, shutter.h);

  for (let y = 79; y < 180; y++) {
    const x = Math.round(slit - (y - 78) * 0.35);
    const width = 1 + Math.floor((y - 78) / 40);
    rect(ctx, white, x, y, width, 1);
  }
};

// Если игрок стёр комнату (`document.body.innerHTML = ``;`), рисовать нечего:
// комната честно гаснет, остаётся только свет снаружи. Следующий запуск —
// чистая страница, и комната вернётся.
export const drawSwitchboard = (ctx, { roomPresent }) => {
  if (!roomPresent) {
    rect(ctx, grey[0], 0, 0, 320, 180);
    return;
  }

  drawWall(ctx);
  drawDoor(ctx);
  drawShutter(ctx);
  drawFloor(ctx);
};
