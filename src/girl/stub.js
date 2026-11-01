import { SWITCHBOARD } from "../rooms/switchboard/backdrop.js";
import { grey } from "../render/palette.js";
import { rect } from "../render/pixels.js";

// Силуэт-заглушка, пока Codex не нарисовал её (этап 9). Она не в DOM:
// это человек, который пользуется твоим кодом. Стоит в полосе дневного
// света, а когда лампа загорается, идёт к двери.
const START = { x: 191, feet: 100 };
const DOOR = {
  x: SWITCHBOARD.door.x + 4,
  feet: SWITCHBOARD.door.y + SWITCHBOARD.door.h + 1,
};
const SPEED = 18;

// Фигура ровно 14 в ширину: столько места под неё заложено на полу.
export const drawSilhouette = (ctx, x, feet, height, step = 0) => {
  const top = feet - height;
  rect(ctx, grey[4], x + 4, top, 6, 6);
  rect(ctx, grey[4], x, top + 6, 14, height - 12);
  rect(ctx, grey[4], x + 2 - step, feet - 6, 4, 6);
  rect(ctx, grey[4], x + 8 + step, feet - 6, 4, 6);
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

export const drawGirl = (ctx, girl, time) => {
  if (girl.mode === `gone`) return;

  const { progress } = girl;
  const x = Math.round(START.x + (DOOR.x - START.x) * progress);
  const feet = Math.round(START.feet + (DOOR.feet - START.feet) * progress);

  if (girl.mode === `walk`) {
    drawSilhouette(ctx, x, feet, 36, Math.floor(time / 180) % 2);
  } else {
    drawSilhouette(ctx, x, feet - (Math.floor(time / 700) % 2), 36);
  }
};
