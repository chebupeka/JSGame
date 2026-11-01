import { drawGirl } from "../girl/stub.js";
import { drawSwitchboard } from "../rooms/switchboard/backdrop.js";
import { drawSwitchboardThings } from "../rooms/switchboard/things.js";
import { drawTerminalBody } from "../terminal/body.js";
import { drawLever } from "../terminal/lever.js";

// world — последний снимок из песочницы: есть ли комната и вещи в ней.
export const drawScene = (ctx, state, time) => {
  const { layout, overlays, world, girl, lever, sprites } = state;
  const roomPresent = world?.room.present ?? true;

  drawSwitchboard(ctx, { roomPresent });
  if (roomPresent) drawSwitchboardThings(ctx, world?.things);
  overlays.forEach((draw) => draw(ctx, layout));
  drawGirl(ctx, girl, time);
  drawTerminalBody(ctx, layout, sprites?.terminal);
  drawLever(ctx, layout.lever, lever.closed);
};
