import { GIRL_PATH, drawGirl } from "../girl/stub.js";
import {
  SWITCHBOARD,
  drawDaylight,
  drawSwitchboard,
} from "../rooms/switchboard/backdrop.js";
import {
  drawSwitchboardThings,
  hasClass,
} from "../rooms/switchboard/things.js";
import { drawTerminalBody } from "../terminal/body.js";
import { drawLever } from "../terminal/lever.js";
import { drawLampLight } from "./light.js";

// Лампа горит — на полу её свет. Пока песочница не прислала настоящую
// рамку лампы (0×0), света тоже нет: игра не угадывает.
const drawLight = (ctx, lamp) => {
  if (!hasClass(lamp, `on`) || lamp.rect.width === 0) return;

  drawLampLight(ctx, {
    lamp: [lamp.rect.x + lamp.rect.width / 2, 90],
    path: GIRL_PATH,
    floor: SWITCHBOARD.floor,
  });
};

// world — последний снимок из песочницы: есть ли комната и вещи в ней.
export const drawScene = (ctx, state, time) => {
  const { layout, overlays, world, girl, lever, sprites } = state;
  const roomPresent = world?.room.present ?? true;

  drawSwitchboard(ctx, { roomPresent });
  if (roomPresent) {
    drawSwitchboardThings(ctx, world?.things);
    drawLight(ctx, world?.things.lamp);
  }
  drawDaylight(ctx);
  overlays.forEach((draw) => draw(ctx, layout));
  drawGirl(ctx, girl, time);
  drawTerminalBody(ctx, layout, sprites?.terminal);
  drawLever(ctx, layout.lever, lever.closed);
};
