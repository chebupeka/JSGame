import { grey } from "../../render/palette.js";
import { rect } from "../../render/pixels.js";

// Комната с фальш-окном (глава 2). Места на картинке; room.css ставит
// вещи туда же — это проверяет test/room.test.js. frameBig и frameSmall —
// стёкла окон, knob — плата ручки, knobCenter — ось ручки.
export const FRAME_ROOM = {
  shutter: { x: 14, y: 18, w: 66, h: 60 },
  doorIn: { x: 96, y: 39, w: 20, h: 42 },
  frameBig: { x: 136, y: 22, w: 56, h: 30 },
  doorOut: { x: 226, y: 39, w: 20, h: 42 },
  frameSmall: { x: 225, y: 26, w: 22, h: 8 },
  knob: { x: 260, y: 58, w: 56, h: 24 },
  knobCenter: { x: 272, y: 68, r: 7 },
  monitor: { x: 196, y: 50, w: 22, h: 18 },
  screen: { x: 198, y: 52, w: 18, h: 12 },
  floor: { top: 81, bottom: 106 },
};

const { shutter, doorIn, frameBig, doorOut, frameSmall, knob, monitor } =
  FRAME_ROOM;

// Рама вокруг стекла: тёмная масса, светлые сколы сверху и слева.
const drawFrameBody = (ctx, glass, bar) => {
  rect(ctx, grey[2], glass.x - 3, glass.y - 3, glass.w + 6, glass.h + 3 + bar);
  rect(ctx, grey[3], glass.x - 3, glass.y - 3, glass.w + 6, 1);
  rect(ctx, grey[3], glass.x - 3, glass.y - 3, 1, glass.h + 3 + bar);
  rect(ctx, grey[0], glass.x, glass.y, glass.w, glass.h);
};

// Пока нет картинки от Codex, комнату рисует код: стены, пол, ставень,
// проёмы, рамы окон и плата ручки — ровными серыми массами.
export const drawFrameRoom = (ctx, { roomPresent }) => {
  rect(ctx, grey[0], 0, 0, 320, 180);
  if (!roomPresent) return;

  rect(ctx, grey[1], 0, 0, 320, 81);
  rect(ctx, grey[2], 0, 81, 320, 1);
  for (let y = shutter.y; y < shutter.y + shutter.h - 1; y += 3) {
    rect(ctx, grey[2], shutter.x, y, shutter.w, 2);
  }
  [doorIn, doorOut].forEach(({ x, y, w, h }) => {
    rect(ctx, grey[2], x - 2, y - 2, w + 4, h + 2);
    rect(ctx, grey[0], x, y, w, h);
  });
  drawFrameBody(ctx, frameBig, 8);
  drawFrameBody(ctx, frameSmall, 2);
  rect(ctx, grey[3], knob.x, knob.y, knob.w, knob.h);
  rect(ctx, grey[2], knob.x + 1, knob.y + 1, knob.w - 2, knob.h - 2);
  rect(ctx, grey[3], monitor.x, monitor.y, monitor.w, monitor.h);
  rect(
    ctx,
    grey[0],
    monitor.x + 2,
    monitor.y + 2,
    monitor.w - 4,
    monitor.h - 6,
  );
};
