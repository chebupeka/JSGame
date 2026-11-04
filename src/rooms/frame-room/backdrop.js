import layout from "../../../assets/sprites/bg-frame-room.json" with { type: "json" };
import big from "../../../assets/sprites/frame-big.json" with { type: "json" };
import small from "../../../assets/sprites/frame-small.json" with { type: "json" };
import { grey } from "../../render/palette.js";
import { rect } from "../../render/pixels.js";

// Комната с фальш-окном (глава 2): фон от Codex (assets/sprites/
// bg-frame-room.png), рамы окон и плата ручки — спрайты, нарисованные
// по пикселю (tools/draw_frame_room.py). Места измерены по картинке
// (bg-frame-room.json); room.css ставит вещи туда же — это проверяет
// test/room.test.js. frameBig и frameSmall — стёкла окон (сами вещи
// .frame), knob — плата ручки (#frame-picker), knobCenter — ось ручки.
export const FRAME_ROOM = {
  shutter: layout.shutter,
  doorIn: layout.doorIn,
  doorOut: layout.doorOut,
  frameBig: layout.frameBigGlass,
  frameSmall: layout.frameSmallGlass,
  knob: layout.knob,
  knobCenter: layout.knobCenter,
  monitor: layout.monitor,
  screen: layout.screen,
  floor: { top: layout.floorY, bottom: 106 },
  plates: {
    frame: layout.frameBigPlate,
    frameSmall: layout.frameSmallPlate,
    picker: layout.knobPlate,
  },
};

// Рамы стоят так, чтобы их прозрачное стекло легло ровно на вещь .frame.
const SPRITES = [
  { key: `frameBig`, glass: FRAME_ROOM.frameBig, inner: big.glass },
  { key: `frameSmall`, glass: FRAME_ROOM.frameSmall, inner: small.glass },
  { key: `knob`, glass: FRAME_ROOM.knob, inner: { x: 0, y: 0 } },
];

// Стёрли комнату (`document.body.innerHTML = ``;`) — она честно гаснет.
export const drawFrameRoom = (ctx, { roomPresent, sprites }) => {
  if (!roomPresent || !sprites?.background) {
    rect(ctx, grey[0], 0, 0, 320, 180);
    return;
  }

  ctx.drawImage(sprites.background, 0, 0);
  SPRITES.forEach(({ key, glass, inner }) => {
    const image = sprites[key];
    if (image) ctx.drawImage(image, glass.x - inner.x, glass.y - inner.y);
  });
};
