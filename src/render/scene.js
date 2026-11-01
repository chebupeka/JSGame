import { GIRL_PATH, drawGirl } from "../girl/girl.js";
import {
  SWITCHBOARD,
  drawDaylight,
  drawSwitchboard,
} from "../rooms/switchboard/backdrop.js";
import { SWITCHBOARD_THINGS } from "../rooms/switchboard/manifest.js";
import {
  drawSwitchboardThings,
  hasClass,
} from "../rooms/switchboard/things.js";
import { drawTerminalBody } from "../terminal/body.js";
import { drawLever } from "../terminal/lever.js";
import { drawLampLight } from "./light.js";
import { drawPlate, plateText } from "./stencil.js";
import { drawDottedOutline, drawWire } from "./wires.js";

const GHOST = 0.25;

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

// Таблички вещей: настоящий id или класс. Горят, если к вещи тянется провод.
const drawPlates = (ctx, things, wires) => {
  SWITCHBOARD_THINGS.forEach(({ key, plate }) => {
    const lit = wires.some((wire) => wire.key === key);
    drawPlate(ctx, plate, plateText(things?.[key]), lit);
  });
};

// Призрачные провода, пока печатаешь: к первой найденной вещи (или ко всем
// для querySelectorAll), остальные совпадения — пунктирной обводкой.
const drawWires = (ctx, wires, { socket }) => {
  const from = [socket.x + 2, socket.y + 2];
  const bottom = ({ x, y, width, height }) => [x + width / 2, y + height];

  wires.forEach(({ target, others, all, repeat }) => {
    const targets = all.length ? all : [target];
    targets
      .filter(({ width }) => width > 0)
      .forEach((rect) =>
        drawWire(ctx, from, bottom(rect), { density: GHOST, dashed: repeat }),
      );
    others.forEach((rect) => drawDottedOutline(ctx, rect));
  });
};

// world — последний снимок из песочницы: есть ли комната и вещи в ней.
export const drawScene = (ctx, state, time) => {
  const { layout, overlays, world, girl, lever, sprites, wires } = state;
  const roomPresent = world?.room.present ?? true;

  drawSwitchboard(ctx, { roomPresent, background: sprites?.background });
  if (roomPresent) {
    drawSwitchboardThings(ctx, world?.things, sprites);
    drawPlates(ctx, world?.things, wires);
    drawLight(ctx, world?.things.lamp);
  }
  drawDaylight(ctx);
  overlays.forEach((draw) => draw(ctx, layout));
  drawGirl(ctx, girl, time, sprites?.girl);
  drawTerminalBody(ctx, layout, sprites?.terminal);
  drawWires(ctx, wires, layout);
  drawLever(ctx, layout.lever, lever.closed);
};
