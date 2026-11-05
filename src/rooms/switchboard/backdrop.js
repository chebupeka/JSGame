import layout from "../../../assets/sprites/bg-switchroom.json" with { type: "json" };
import { grey } from "../../render/palette.js";
import { rect } from "../../render/pixels.js";

// Щитовая: фон от Codex (assets/sprites/bg-switchroom.png) и места на нём,
// измеренные по картинке (bg-switchroom.json). Вещи в room.css стоят там же —
// это проверяет test/room.test.js. Табло, лампу в проёме и плафон рисует код.
const MINI = { y: 24, w: 10, h: 8, mini: true };

export const SWITCHBOARD = {
  door: layout.door,
  shutter: layout.shutter,
  lamp: { x: layout.lampMount.x, y: layout.lampMount.y, w: 14, h: 20 },
  board: { x: 50, y: 27, w: 36, h: 11 },
  doorLamp: { x: 59, y: 43, w: 5, h: 7 },
  plafond: { x: 66, y: 40, w: 9, h: 3 },
  plate: layout.plate,
  // Площадки табличек над дверью и слева от неё. slot — своя тёмная
  // подложка: стена здесь в проводах, и по ней букв не прочитать.
  plates: {
    board: { x: 50, y: 19, w: 36, h: 7, slot: true },
    doorLamp: { x: 15, y: 43, w: 41, h: 7, slot: true },
    plafond: { x: 21, y: 52, w: 35, h: 7, slot: true },
  },
  monitor: layout.monitor,
  screen: layout.screen,
  // Экраны по одному на файл: большой монитор на фоне и три малых над ним.
  screens: [
    layout.screen,
    { x: 225, ...MINI },
    { x: 238, ...MINI },
    { x: 251, ...MINI },
  ],
  floor: { top: layout.floorY, bottom: 106 },
};

// Если игрок стёр комнату (`document.body.innerHTML = ``;`), рисовать нечего:
// комната честно гаснет, остаётся только свет снаружи. Следующий запуск —
// чистая страница, и комната вернётся.
export const drawSwitchboard = (ctx, { roomPresent, background }) => {
  if (!roomPresent || !background) {
    rect(ctx, grey[0], 0, 0, 320, 180);
    return;
  }

  ctx.drawImage(background, 0, 0);
};
