import { drawGlass, drawWindowLight } from "../../render/glass.js";
import { drawPlates } from "../../render/plates.js";
import { FRAME_TASK } from "../../tasks/frame.js";
import { drawMonitor } from "../switchboard/monitor.js";
import { FRAME_ROOM, drawFrameRoom } from "./backdrop.js";
import css from "./room.css?raw";
import html from "./room.html?raw";
import { drawKnob, knobAt, knobTurn } from "./knob.js";
import { createScenario } from "./scenario.js";

// Место 2 — комната с фальш-окном, утро (глава 2). Окно на дальней стене
// светит только тем, что сделал код; ручка — настоящий <input type="color">.
const { knobCenter, shutter, doorOut, floor, plates } = FRAME_ROOM;

// plate — ровная площадка, где выбита табличка: на плате ручки, на
// подоконнике большой рамы и на стене над окошком у двери.
const THINGS = [
  {
    key: `picker`,
    selector: `#frame-picker`,
    plate: plates.picker,
    // Какие события шлёт ручка. В браузере у элемента это не спросить.
    events: [`input`, `change`, `click`],
  },
  {
    key: `frame`,
    selector: `.frame-room > .frame:first-child`,
    plate: plates.frame,
  },
  {
    key: `frameSmall`,
    selector: `.frame-room > .door + .frame`,
    plate: plates.frameSmall,
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
  const { width, height } = thing?.rect ?? {};
  if (!thing?.present || width < 1 || height < 1) return;
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

  // Здесь ей командует сценарий: она сама пробует ручку и проверяет код.
  createScenario,
  ready: () => false,
  // Перестала пробовать: села в свет окна.
  finished: ({ mode }) => mode === `sit` || mode === `sat`,

  draw: (ctx, view) => {
    const { world, sprites, roomPresent, solved, glow } = view;
    drawFrameRoom(ctx, { roomPresent, sprites: sprites?.frameRoom });
    if (!roomPresent) return;

    drawWindow(ctx, world?.things.frame, glow.frame, true);
    drawWindow(ctx, world?.things.frameSmall, glow.frameSmall, false);
    drawKnob(ctx, knobCenter, world?.things.picker?.value);
    drawPlates(ctx, THINGS, view);
    drawMonitor(ctx, FRAME_ROOM.screen, solved);
  },
};
