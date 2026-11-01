import { drawSwitchboard } from "../rooms/switchboard/backdrop.js";
import { drawTerminalBody } from "../terminal/body.js";

export const drawScene = (ctx, { layout, overlays }) => {
  drawSwitchboard(ctx);
  overlays.forEach((draw) => draw(ctx, layout));
  drawTerminalBody(ctx, layout);
};
