import layout from "../../../assets/sprites/bg-switchroom.json" with { type: "json" };
import { grey } from "../../render/palette.js";
import { rect } from "../../render/pixels.js";

// Щитовая: фон от Codex (assets/sprites/bg-switchroom.png) и места на нём,
// измеренные по картинке (bg-switchroom.json). Лампа и дверь в room.css
// стоят там же — это проверяет test/room.test.js.
export const SWITCHBOARD = {
  door: layout.door,
  shutter: layout.shutter,
  lamp: { x: layout.lampMount.x, y: layout.lampMount.y, w: 14, h: 20 },
  plate: layout.plate,
  monitor: layout.monitor,
  screen: layout.screen,
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
