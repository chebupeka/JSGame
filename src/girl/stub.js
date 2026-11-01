import { SWITCHBOARD } from "../rooms/switchboard/backdrop.js";
import { grey } from "../render/palette.js";
import { rect } from "../render/pixels.js";

// Силуэт-заглушка, пока Codex не нарисовал её (этап 9). Она не в DOM:
// это человек, который пользуется твоим кодом. Стоит в полосе дневного
// света, а когда лампа загорается, идёт к двери.
const { slit, door } = SWITCHBOARD;
const START_FEET = 100;
const START = {
  x: Math.round(slit.x - (START_FEET - slit.bottom) * 0.35) - 7,
  feet: START_FEET,
};
const DOOR = {
  x: door.x + Math.round(door.w / 2) - 7,
  feet: door.y + door.h,
};
const SPEED = 18;

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

export const createGirl = () => ({ mode: `stand`, x: START.x, progress: 0 });

export const resetGirl = (girl) => Object.assign(girl, createGirl());

export const updateGirl = (girl, { lampOn }, dt) => {
  if (girl.mode === `stand` && lampOn) girl.mode = `walk`;
  if (girl.mode !== `walk`) return;

  const distance = START.x - DOOR.x;
  girl.progress = Math.min(1, girl.progress + (SPEED * dt) / distance);
  if (girl.progress === 1) girl.mode = `gone`;
};

// Её путь: от полосы дневного света до порога двери. Свет лампы ложится
// ровно на эту дорожку (src/render/light.js).
export const GIRL_PATH = [
  [START.x + 7, START.feet],
  [DOOR.x + 7, DOOR.feet],
];

// У освещённого порога она темнеет до цвета дверного проёма
// и растворяется в нём.
const FADE = [
  [0.92, grey[1]],
  [1, grey[0]],
];

export const drawGirl = (ctx, girl, time) => {
  if (girl.mode === `gone`) return;

  const { progress } = girl;
  const x = Math.round(START.x + (DOOR.x - START.x) * progress);
  const feet = Math.round(START.feet + (DOOR.feet - START.feet) * progress);
  const color = FADE.find(([until]) => progress < until)?.[1] ?? grey[0];

  if (girl.mode === `walk`) {
    drawSilhouette(ctx, x, feet, 36, Math.floor(time / 180) % 2, color);
  } else {
    drawSilhouette(ctx, x, feet - (Math.floor(time / 700) % 2), 36, 0, color);
  }
};
