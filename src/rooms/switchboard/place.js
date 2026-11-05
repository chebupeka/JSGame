import { blue, blueGlow } from "../../render/palette.js";
import { drawLampLight, drawLightIn } from "../../render/light.js";
import { drawPlates } from "../../render/plates.js";
import { SWITCHBOARD, drawSwitchboard } from "./backdrop.js";
import {
  SWITCHBOARD_NAMES,
  SWITCHBOARD_ROOM,
  SWITCHBOARD_THINGS,
} from "./manifest.js";
import { drawMonitors } from "./monitor.js";
import { SWITCHBOARD_TASKS, STRIP, THRESHOLD } from "./tasks.js";
import { drawSwitchboardThings, hasClass } from "./things.js";

// Место 1 — щитовая, раннее утро (глава 1). Она стоит у ставня в полоске
// дневного света, а когда лампа загорается, идёт по свету к порогу.
const PATH = [STRIP, THRESHOLD];

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

// Свет в тамбуре. Лампа в проёме светит только начало, поэтому она делает
// шаг и останавливается. Плафон светит весь тамбур: чем светлее цвет, тем
// гуще точки. Немного света выходит на пол у порога.
const drawVestibule = (ctx, things, level) => {
  const { door } = SWITCHBOARD;
  const lampLit = hasClass(things?.doorLamp, `on`);
  if (!lampLit && level === null) return;

  const lamp = (x, y) =>
    lampLit ? 0.62 - Math.hypot(x - door.x - 3, y - door.y - 12) / 26 : 0;
  const plafond = (x, y) =>
    level === null
      ? 0
      : Math.max(level, 1 / 16) * 1.8 -
        (Math.abs(x - door.x - 12) + (y - door.y)) / 90;
  drawLightIn(ctx, door, (x, y) => Math.max(lamp(x, y), plafond(x, y)));

  const below = { x: door.x - 2, y: door.y + door.h, w: door.w + 4, h: 7 };
  drawLightIn(
    ctx,
    below,
    (x, y) =>
      Math.max(lampLit ? 0.25 : 0, level ?? 0) -
      (y - below.y) / 12 -
      Math.abs(x - below.x - below.w / 2) / 40,
  );
};

export const SWITCHBOARD_PLACE = {
  key: `switchboard`,
  room: SWITCHBOARD_ROOM,
  things: SWITCHBOARD_THINGS,
  names: SWITCHBOARD_NAMES,
  tasks: SWITCHBOARD_TASKS,
  layout: SWITCHBOARD,
  path: PATH,

  // Стёкла, которые светят цветом из CSS.
  glows: [`plafond`],

  draw: (ctx, view) => {
    const { world, sprites, roomPresent, monitors, glow } = view;
    drawSwitchboard(ctx, { roomPresent, background: sprites?.background });
    if (!roomPresent) return;

    drawVestibule(ctx, world?.things, glow.plafond ?? null);
    drawSwitchboardThings(ctx, world?.things, sprites, glow);
    drawPlates(ctx, SWITCHBOARD_THINGS, view);
    drawLight(ctx, world?.things.lamp);
    // Решённые файлы работают на мониторах на стене.
    drawMonitors(ctx, SWITCHBOARD.screens, monitors);
  },
};
