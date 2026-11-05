import { drawLampLight } from "../../render/light.js";
import { drawPlates } from "../../render/plates.js";
import { LAMP_TASK } from "../../tasks/lamp.js";
import { SWITCHBOARD, drawSwitchboard } from "./backdrop.js";
import {
  SWITCHBOARD_NAMES,
  SWITCHBOARD_ROOM,
  SWITCHBOARD_THINGS,
} from "./manifest.js";
import { drawMonitor } from "./monitor.js";
import { drawSwitchboardThings, hasClass } from "./things.js";

// Место 1 — щитовая, утро (глава 1). Она стоит у ставня в полоске
// дневного света, а когда лампа загорается, идёт по свету к двери.
const { shutter, door } = SWITCHBOARD;

// Её путь (точки ног): от ставня до порога двери. Свет лампы ложится
// ровно на эту дорожку.
const PATH = [
  [shutter.x + Math.round(shutter.w / 2), 92],
  [door.x + Math.round(door.w / 2), door.y + door.h],
];

// Лампа горит — на полу её свет. Пока песочница не прислала настоящую
// рамку лампы (0×0), света тоже нет: игра не угадывает.
const drawLight = (ctx, lamp) => {
  if (!hasClass(lamp, `on`) || lamp.rect.width === 0) return;

  drawLampLight(ctx, {
    lamp: [lamp.rect.x + lamp.rect.width / 2, 90],
    path: PATH,
    floor: SWITCHBOARD.floor,
  });
};

export const SWITCHBOARD_PLACE = {
  key: `switchboard`,
  room: SWITCHBOARD_ROOM,
  things: SWITCHBOARD_THINGS,
  names: SWITCHBOARD_NAMES,
  task: LAMP_TASK,
  layout: SWITCHBOARD,
  path: PATH,

  // Ей нужно одно: свет. Лампа горит — она идёт.
  ready: (world) => !!world?.room.present && hasClass(world.things.lamp, `on`),
  // Перестала пробовать: прошла в дверь.
  finished: ({ mode }) => mode === `gone`,

  draw: (ctx, view) => {
    const { world, sprites, roomPresent, solved } = view;
    drawSwitchboard(ctx, { roomPresent, background: sprites?.background });
    if (!roomPresent) return;

    drawSwitchboardThings(ctx, world?.things, sprites);
    drawPlates(ctx, SWITCHBOARD_THINGS, view);
    drawLight(ctx, world?.things.lamp);
    // Решённый файл работает на мониторе на стене.
    drawMonitor(ctx, SWITCHBOARD.screen, solved);
  },
};
