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
  // По экрану на файл: большой монитор на фоне и два малых рядом с ним.
  screens: [
    layout.screen,
    { x: 252, y: 19, w: 10, h: 8 },
    { x: 252, y: 30, w: 10, h: 8 },
  ],
  // Табло у двери — над платой ручки. Табличка прямо на нём, пока оно пустое.
  colorBoard: { x: 212, y: 39, w: 56, h: 10 },
  floor: { top: layout.floorY, bottom: 106 },
  plates: {
    frame: layout.frameBigPlate,
    frameSmall: layout.frameSmallPlate,
    picker: layout.knobPlate,
    colorBoard: { x: 212, y: 39, w: 56, h: 10, onThing: true },
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
