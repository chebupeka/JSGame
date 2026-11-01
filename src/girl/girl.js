import { SWITCHBOARD } from "../rooms/switchboard/backdrop.js";
import { grey } from "../render/palette.js";
import { rect } from "../render/pixels.js";

// Она. Её нет в DOM: это человек, который пользуется твоим кодом.
// Стоит перед ставнем спиной к нам, там, где из-под него пробивается
// дневной свет, а когда лампа загорается, идёт к двери.
//
// Спрайты — листы кадров assets/sprites/girl-<действие>.png: клетки 24×40,
// ноги в точке (12, 39) каждой клетки. Ходьба нарисована лицом вправо,
// влево — зеркалом. Пока листов нет, вместо неё тёмный силуэт.
const CELL = { w: 24, h: 40 };
const FEET = { x: 12, y: 39 };
const STEP = 3;
const SPEED = 18;

const { shutter, door } = SWITCHBOARD;
const START = {
  x: shutter.x + Math.round(shutter.w / 2),
  feet: 92,
};
const DOOR = {
  x: door.x + Math.round(door.w / 2),
  feet: door.y + door.h,
};

// Её путь (точки ног): от ставня до порога двери.
// Свет лампы ложится ровно на эту дорожку (src/render/light.js).
export const GIRL_PATH = [
  [START.x, START.feet],
  [DOOR.x, DOOR.feet],
];

export const createGirl = () => ({ mode: `stand`, progress: 0 });

export const resetGirl = (girl) => Object.assign(girl, createGirl());

export const updateGirl = (girl, { lampOn }, dt) => {
  if (girl.mode === `stand` && lampOn) girl.mode = `walk`;
  if (girl.mode !== `walk`) return;

  const distance = START.x - DOOR.x;
  girl.progress = Math.min(1, girl.progress + (SPEED * dt) / distance);
  if (girl.progress === 1) girl.mode = `gone`;
};

// Фигура ровно 14 в ширину: столько места под неё заложено на полу.
// Тёмная, как она на референсе против светлого.
export const drawSilhouette = (
  ctx,
  x,
  feet,
  height,
  step = 0,
  color = grey[1],
) => {
  const top = feet - height;
  rect(ctx, color, x + 4, top, 6, 6);
  rect(ctx, color, x, top + 6, 14, height - 12);
  rect(ctx, color, x + 2 - step, feet - 6, 4, 6);
  rect(ctx, color, x + 8 + step, feet - 6, 4, 6);
};

// Кадр листа так, чтобы ноги встали в точку (feetX, feetY).
const drawFrame = (ctx, sheet, frame, feetX, feetY, mirror) => {
  const x = feetX - FEET.x;
  const y = feetY - FEET.y;
  const source = frame * CELL.w;

  if (!mirror) {
    ctx.drawImage(sheet, source, 0, CELL.w, CELL.h, x, y, CELL.w, CELL.h);
    return;
  }

  ctx.save();
  ctx.translate(x + CELL.w, y);
  ctx.scale(-1, 1);
  ctx.drawImage(sheet, source, 0, CELL.w, CELL.h, 0, 0, CELL.w, CELL.h);
  ctx.restore();
};

const frames = (sheet) => Math.max(1, Math.floor(sheet.width / CELL.w));

// У освещённого порога она темнеет на ступень палитры, до цвета дверного
// проёма, и растворяется в нём.
const FADE_FROM = 0.92;

export const drawGirl = (ctx, girl, time, sheets) => {
  if (girl.mode === `gone`) return;

  const { progress } = girl;
  const feetX = Math.round(START.x + (DOOR.x - START.x) * progress);
  const feetY = Math.round(START.feet + (DOOR.feet - START.feet) * progress);
  const fading = progress >= FADE_FROM;
  const walking = girl.mode === `walk`;

  if (!sheets?.stand || !sheets?.walk) {
    const step = walking ? Math.floor(time / 180) % 2 : 0;
    const bob = walking ? 0 : Math.floor(time / 700) % 2;
    const color = fading ? grey[0] : grey[1];
    drawSilhouette(ctx, feetX - 7, feetY - bob, 36, step, color);
    return;
  }

  const set = fading ? sheets.dark : sheets;
  if (walking) {
    // Кадр шага привязан к пройденному пути, а не ко времени:
    // ноги не скользят по полу.
    const walked = (START.x - DOOR.x) * progress;
    const frame = Math.floor(walked / STEP) % frames(set.walk);
    drawFrame(ctx, set.walk, frame, feetX, feetY, true);
    return;
  }

  const frame = Math.floor(time / 700) % frames(set.stand);
  drawFrame(ctx, set.stand, frame, feetX, feetY, false);
};
