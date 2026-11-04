import { drawGlass, drawWindowLight } from "../../render/glass.js";
import { drawPlates } from "../../render/plates.js";
import { FRAME_TASK } from "../../tasks/frame.js";
import { drawMonitor } from "../switchboard/monitor.js";
import { FRAME_ROOM, drawFrameRoom } from "./backdrop.js";
import css from "./room.css?raw";
import html from "./room.html?raw";
import { drawKnob, knobAt, knobTurn } from "./knob.js";

// Место 2 — комната с фальш-окном, утро (глава 2). Окно на дальней стене
// светит только тем, что сделал код; ручка — настоящий <input type="color">.
const { frameBig, frameSmall, knob, knobCenter, shutter, doorOut, floor } =
  FRAME_ROOM;

const THINGS = [
  {
    key: `picker`,
    selector: `#frame-picker`,
    plate: { x: knob.x + 2, y: knob.y + knob.h - 8, w: knob.w - 4, h: 7 },
    // Какие события шлёт ручка. В браузере у элемента это не спросить.
    events: [`input`, `change`, `click`],
  },
  {
    key: `frame`,
    selector: `.frame-room > .frame:first-child`,
    plate: { x: frameBig.x + 16, y: frameBig.y + frameBig.h + 1, w: 24, h: 7 },
  },
  {
    key: `frameSmall`,
    selector: `.frame-room > .door + .frame`,
    plate: { x: frameSmall.x - 1, y: frameSmall.y - 11, w: 24, h: 7 },
  },
];

const NAMES = {
  ids: [...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => id),
  classes: [
    ...new Set(
      [...html.matchAll(/class="([^"]+)"/g)].flatMap(([, list]) =>
        list.split(/\s+/),
      ),
    ),
  ],
  labels: { "frame-picker": `на ручке`, frame: `на раме окна` },
};

// Окно светит, только если рамка из песочницы уже настоящая. Яркость —
// сглаженная ограничителем вспышек (src/render/glow.js).
const drawWindow = (ctx, thing, level, lightFloor) => {
  if (!thing?.present || thing.rect.width < 1) return;
  drawGlass(ctx, thing.rect, level ?? null);
  if (lightFloor) drawWindowLight(ctx, thing.rect, level ?? null, floor);
};

export const FRAME_PLACE = {
  key: `frame-room`,
  room: { html, css },
  things: THINGS,
  names: NAMES,
  task: FRAME_TASK,
  layout: FRAME_ROOM,
  path: [
    [shutter.x + Math.round(shutter.w / 2), 92],
    [doorOut.x + Math.round(doorOut.w / 2), doorOut.y + doorOut.h],
  ],

  // Стёкла, которые светят цветом из CSS.
  glows: [`frame`, `frameSmall`],

  // Ручку крутят мышью: от тёмного к светлому.
  knob: { key: `picker`, center: knobCenter, at: knobAt, turn: knobTurn },

  // Её проверка окна — этап 15. Пока она стоит у ставня.
  ready: () => false,

  draw: (ctx, view) => {
    const { world, roomPresent, solved, glow } = view;
    drawFrameRoom(ctx, { roomPresent });
    if (!roomPresent) return;

    drawWindow(ctx, world?.things.frame, glow.frame, true);
    drawWindow(ctx, world?.things.frameSmall, glow.frameSmall, false);
    drawKnob(ctx, knobCenter, world?.things.picker?.value);
    drawPlates(ctx, THINGS, view);
    drawMonitor(ctx, FRAME_ROOM.screen, solved);
  },
};
