import { drawGirl } from "../girl/girl.js";
import { SCENE } from "../screen/scale.js";
import { drawTerminalBody } from "../terminal/body.js";
import { drawEdges } from "../terminal/edges.js";
import { drawBreaker, drawLever, drawSlowToggle } from "../terminal/lever.js";
import { looseLook, pulseLook } from "../trace/replay.js";
import { blue, blueGlow, grey, white } from "./palette.js";
import { ditherFill, rect } from "./pixels.js";
import { drawDottedOutline, drawWire } from "./wires.js";

const GHOST = 0.25;

// Дневной свет снаружи: рулонный ставень не доходит до пола, и из-под него
// пробивается тонкая полоска света, как под дверью. Рисуется поверх всего
// в комнате — его не делал игрок. Ночью её не будет.
const drawDaylight = (ctx, { x, y, w, h }) => {
  rect(ctx, white, x + 2, y + h - 1, w - 4, 1);
};

// Призрачные провода, пока печатаешь: к первой найденной вещи (или ко всем
// для querySelectorAll), остальные совпадения — пунктирной обводкой.
const bottom = ({ x, y, width, height }) => [x + width / 2, y + height];

const drawWires = (ctx, wires, { socket }) => {
  const from = [socket.x + 2, socket.y + 2];

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

// Показ по шагам: импульс бежит по проводу к найденной вещи; провод,
// который держит переменная, висит на 50 %. Рамка из записи бывает 0×0
// (песочница ещё без размера) — тогда берём рамку вещи из снимка.
// Куда уходит провод в пустоту — от гнезда вверх, в воздух перед ставнем.
const LOOSE = [-24, -54];

const drawRunWires = (
  ctx,
  { pulses, kept, loose },
  { socket },
  world,
  time,
) => {
  const from = [socket.x + 2, socket.y + 2];
  const ends = ({ rects, keys }) =>
    rects
      .map((rect, i) => (rect.width > 0 ? rect : world?.things[keys[i]]?.rect))
      .filter((rect) => rect?.width > 0)
      .map(bottom);

  kept.forEach((wire) =>
    ends(wire).forEach((to) => drawWire(ctx, from, to, { density: 0.5 })),
  );
  pulses.forEach((pulse) =>
    ends(pulse).forEach((to) =>
      drawWire(ctx, from, to, pulseLook(pulse, time)),
    ),
  );

  if (loose) {
    const { upTo, head, live, sway } = looseLook(loose, time);
    const end = [
      socket.x + LOOSE[0] + Math.round(sway),
      socket.y + LOOSE[1] + Math.round(Math.abs(sway) * 0.3),
    ];
    drawWire(ctx, from, end, {
      density: 1,
      upTo,
      head,
      color: live ? blue : blueGlow,
    });
  }
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
    time,
    solved: state.solved,
  });
  // Вещь под щупом обведена пунктиром.
  if (roomPresent && probed?.present) drawDottedOutline(ctx, probed.rect);
  drawDaylight(ctx, place.layout.shutter);
  overlays.forEach((draw) => draw(ctx, layout));
  drawGirl(ctx, girl, time, sprites?.girl);
  // Свет в комнате проседает: первый медленный показ, ошибка, сторож.
  const dim = Math.max(trace.dip, state.dim ?? 0);
  ditherFill(ctx, grey[0], dim, 0, 0, SCENE.width, SCENE.height);
  drawTerminalBody(ctx, layout, sprites?.terminal);
  if (trace.lines.size) drawEdges(ctx, layout, trace, state.lineBoxes());
  drawWires(ctx, wires, layout);
  drawRunWires(ctx, trace, layout, world, time);
  drawLever(ctx, layout.lever, lever, time, sprites?.lever);
  drawBreaker(ctx, layout.breaker, state.breaker.tripped, sprites?.breaker);
  drawSlowToggle(ctx, layout.slow, trace.slow);
};
