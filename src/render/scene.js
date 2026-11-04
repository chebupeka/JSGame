import { drawGirl } from "../girl/girl.js";
import { SCENE } from "../screen/scale.js";
import { drawTerminalBody } from "../terminal/body.js";
import { drawEdges } from "../terminal/edges.js";
import { drawBreaker, drawLever, drawSlowToggle } from "../terminal/lever.js";
import { sensorKind } from "../rooms/events.js";
import { pulseActive } from "../trace/replay.js";
import { drawCorners } from "./corners.js";
import { blueGlow, blueLight, grey, white } from "./palette.js";
import { ditherFill, rect } from "./pixels.js";
import { drawSensor, sensorRect, sensorSpot } from "./sensor.js";

// Дневной свет снаружи: рулонный ставень не доходит до пола, и из-под него
// пробивается тонкая полоска света, как под дверью. Рисуется поверх всего
// в комнате — его не делал игрок. Ночью её не будет.
const drawDaylight = (ctx, { x, y, w, h }) => {
  rect(ctx, white, x + 2, y + h - 1, w - 4, 1);
};

// Что нашёл код — без проводов через комнату (решение 9 в CLAUDE.md).
// Пока печатаешь, о находке говорит горящая табличка вещи; тусклые
// уголки — вещь тоже подходит, но querySelector берёт первую по разметке.
// В показе по шагам светлые уголки — её нашли прямо сейчас. Рамка
// из записи бывает 0×0 (песочница ещё без размера) — тогда берём рамку
// вещи из снимка.
const rectOf = (rect, key, world) => {
  const found = rect?.width > 0 ? rect : world?.things[key]?.rect;
  return found?.width > 0 ? found : null;
};

const drawFound = (ctx, { wires, trace, world }, time) => {
  wires.forEach(({ others }) =>
    others.forEach((rect) => drawCorners(ctx, rect, blueGlow)),
  );

  trace.pulses
    .filter((pulse) => pulseActive(pulse, time))
    .forEach(({ rects, keys }) =>
      rects.forEach((rect, i) => {
        const box = rectOf(rect, keys[i], world);
        if (box) drawCorners(ctx, box, blueLight);
      }),
    );
};

// Датчики на вещах. Призрачные — пока печатаешь (тусклые), защёлкнутые —
// после запуска (синие, лампа медленно мигает), сработавшие — на миг
// светлые.

const thingOf = (place, key) => place.things.find((thing) => thing.key === key);

const drawSensors = (ctx, { ghosts, trace, place, world }, time) => {
  const live = new Set(
    [...trace.sensors.values()].map(({ key, type }) => `${key} ${type}`),
  );
  ghosts.forEach((ghost) => {
    if (live.has(`${ghost.key} ${ghost.type}`)) return;
    const rect = sensorRect(ghost, world);
    if (!rect) return;
    drawSensor(ctx, sensorSpot(rect), {
      kind: sensorKind(ghost.type, thingOf(place, ghost.key)),
      state: `ghost`,
      blink: true,
    });
  });

  trace.sensors.forEach((sensor) => {
    const rect = sensorRect(sensor, world);
    if (!rect) return;
    const firing = trace.impulses.some(({ id }) => id === sensor.id);
    drawSensor(ctx, sensorSpot(rect), {
      kind: sensorKind(sensor.type, thingOf(place, sensor.key)),
      state: firing ? `fire` : `wait`,
      blink: firing || Math.floor(time / 800) % 2 === 0,
    });
  });
};

// world — последний снимок из песочницы: есть ли комната и вещи в ней.
export const drawScene = (ctx, state, time) => {
  const { layout, overlays, world, girl, lever, sprites, wires, trace, place } =
    state;
  const roomPresent = world?.room.present ?? true;
  const probed = state.probe && world?.things[state.probe];

  // Комната места: фон, вещи, таблички, свет от кода игрока, монитор.
  place.draw(ctx, {
    world,
    sprites,
    roomPresent,
    wires,
    flash: state.flash,
    // Вещи, которые держит переменная: их табличка горит и после показа.
    held: new Set(trace.kept.flatMap(({ keys }) => keys)),
    time,
    solved: state.solved,
    glow: state.glow,
  });
  if (roomPresent) {
    drawFound(ctx, state, time);
    drawSensors(ctx, state, time);
  }
  // Вещь под щупом — тусклые уголки.
  if (roomPresent && probed?.present) {
    drawCorners(ctx, probed.rect, blueGlow);
  }
  drawDaylight(ctx, place.layout.shutter);
  overlays.forEach((draw) => draw(ctx, layout));
  drawGirl(ctx, girl, time, sprites?.girl);
  // Свет в комнате проседает: первый медленный показ, ошибка, сторож.
  const dim = Math.max(trace.dip * (state.calm ? 0.4 : 1), state.dim ?? 0);
  ditherFill(ctx, grey[0], dim, 0, 0, SCENE.width, SCENE.height);
  drawTerminalBody(ctx, layout, sprites?.terminal);
  if (trace.lines.size || trace.flashes.size) {
    drawEdges(ctx, layout, trace, state.lineBoxes());
  }
  drawLever(ctx, layout.lever, lever, time, sprites?.lever);
  drawBreaker(ctx, layout.breaker, state.breaker.tripped, sprites?.breaker);
  drawSlowToggle(ctx, layout.slow, trace.slow);
};
