import layout from "../../../assets/sprites/bg-switchroom.json" with { type: "json" };
import { grey, white } from "../../render/palette.js";
import { rect } from "../../render/pixels.js";

// Щитовая: фон от Codex (assets/sprites/bg-switchroom.png) и места на нём,
// измеренные по картинке (bg-switchroom.json). Лампа и дверь в room.css
// стоят там же — это проверяет test/room.test.js.
export const SWITCHBOARD = {
  door: layout.door,
  shutter: layout.shutter,
  slit: layout.slit,
  lamp: { x: layout.lampMount.x, y: layout.lampMount.y, w: 14, h: 20 },
  plate: layout.plate,
  monitor: layout.monitor,
  floor: { top: layout.floorY, bottom: 106 },
};

const { slit } = SWITCHBOARD;

// Дневной свет снаружи: щель в ставне и полоса из неё на полу к камере.
// Рисуется поверх всего в комнате — его не делал игрок, и он есть всегда.
export const drawDaylight = (ctx) => {
  rect(ctx, white, slit.x, slit.top, 1, slit.bottom - slit.top);

  for (let y = slit.bottom; y < 180; y++) {
    const x = Math.round(slit.x - (y - slit.bottom) * 0.35);
    const width = 1 + Math.floor((y - slit.bottom) / 40);
    rect(ctx, white, x, y, width, 1);
  }
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
