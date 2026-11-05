import { grey } from "../render/palette.js";
import { rect } from "../render/pixels.js";

// Она. Её нет в DOM: это человек, который пользуется твоим кодом.
// Ей командует проверка задачи (src/tasks/check.js и сценарии мест):
// goTo, а затем режимы stand (стоит), turn (крутит), wait (ждёт),
// sit и sat (садится и сидит), rise (встаёт), gone (скрылась).
//
// Спрайты — листы кадров assets/sprites/girl-<действие>.png: клетки 24×40,
// ноги в точке (12, 39) каждой клетки. Ходьба нарисована лицом вправо,
// влево — зеркалом. Пока листов нет, вместо неё тёмный силуэт.
const CELL = { w: 24, h: 40 };
const FEET = { x: 12, y: 39 };
const STEP = 3;
const SPEED = 18;
// Один кадр «сесть» — столько секунд.
const SIT_FRAME = 0.35;
const SIT_FRAMES = 4;

export const createGirl = (path) => ({
  mode: `stand`,
  progress: 0,
  path,
  // Что делать, когда дошла: режим, null — уйти за порог.
  then: null,
  // Кадр «крутить» (ставит сценарий) и когда начала садиться.
  turn: 0,
  // Скорость: в архиве она ходит вдоль полки, и ждать её долго незачем.
  speed: SPEED,
  // Несёт находку и сколько находок уже на столе.
  carrying: false,
  onTable: 0,
  clock: 0,
  sitAt: 0,
});

export const resetGirl = (girl, path = girl.path) =>
  Object.assign(girl, createGirl(path));

// Поставить её в точку [x, ноги] в этом режиме.
export const placeGirl = (girl, [x, feet], mode) =>
  Object.assign(girl, {
    mode,
    path: [
      [x, feet],
      [x, feet],
    ],
    progress: 1,
  });

const feetOf = ({ progress, path: [[fromX, fromFeet], [toX, toFeet]] }) => ({
  feetX: Math.round(fromX + (toX - fromX) * progress),
  feetY: Math.round(fromFeet + (toFeet - fromFeet) * progress),
});

// Идти отсюда в точку [x, ноги], там перейти в режим then.
export const walkTo = (girl, to, then) => {
  const { feetX, feetY } = feetOf(girl);
  Object.assign(girl, {
    mode: `walk`,
    path: [[feetX, feetY], to],
    progress: 0,
    then,
  });
};

export const sitDown = (girl) => {
  girl.mode = `sit`;
  girl.sitAt = girl.clock;
};

const isSeated = ({ mode }) => mode === `sit` || mode === `sat`;

// Дойти до точки и принять позу. Сидит — сначала встанет. Уже здесь —
// примет позу на месте. Поза gone — скрылась за порогом, потемнев у него.
export const goTo = (girl, to, pose) => {
  const then = pose === `gone` ? null : pose;
  if (isSeated(girl)) {
    Object.assign(girl, {
      mode: `rise`,
      sitAt: girl.clock,
      after: { to, then },
    });
    return;
  }

  const { feetX, feetY } = feetOf(girl);
  if (feetX !== to[0] || feetY !== to[1]) return walkTo(girl, to, then);
  if (pose === `sit`) return sitDown(girl);
  girl.mode = pose;
};

// Какой режим значит, что она приняла позу и больше не двигается.
export const settled = (girl, pose) =>
  girl.mode === (pose === `sit` ? `sat` : pose);

export const updateGirl = (girl, dt) => {
  girl.clock += dt;
  const held = girl.clock - girl.sitAt;
  if (girl.mode === `sit` && held >= SIT_FRAME * SIT_FRAMES) girl.mode = `sat`;
  if (girl.mode === `rise` && held >= SIT_FRAME * SIT_FRAMES) {
    girl.mode = `stand`;
    const { to, then } = girl.after;
    goTo(girl, to, then ?? `gone`);
  }
  if (girl.mode !== `walk`) return;

  const [[fromX, fromFeet], [toX, toFeet]] = girl.path;
  const distance = Math.max(1, Math.hypot(toX - fromX, toFeet - fromFeet));
  girl.progress = Math.min(1, girl.progress + (girl.speed * dt) / distance);
  if (girl.progress < 1) return;
  if (girl.then === `sit`) sitDown(girl);
  else girl.mode = girl.then ?? `gone`;
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

// Находка у неё в руках: светлая коробочка на уровне пояса.
export const drawCarried = (ctx, girl) => {
  if (!girl.carrying || girl.mode === `gone`) return;
  const { feetX, feetY } = feetOf(girl);
  rect(ctx, grey[4], feetX - 2, feetY - 21, 5, 4);
  rect(ctx, grey[1], feetX - 2, feetY - 18, 5, 1);
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

// Где она в кадре: щуп на ней ничего не найдёт — её нет в DOM.
export const girlBox = (girl) => {
  if (girl.mode === `gone`) return null;
  const { feetX, feetY } = feetOf(girl);
  return { x: feetX - 7, y: feetY - 36, w: 14, h: 36 };
};

export const drawGirl = (ctx, girl, time, sheets) => {
  if (girl.mode === `gone`) return;

  const { progress, mode } = girl;
  const { feetX, feetY } = feetOf(girl);
  // Темнеет только у порога, куда уходит насовсем.
  const fading = progress >= FADE_FROM && mode === `walk` && !girl.then;
  const walking = mode === `walk`;

  if (!sheets?.stand || !sheets?.walk) {
    const step = walking ? Math.floor(time / 180) % 2 : 0;
    const bob = walking ? 0 : Math.floor(time / 700) % 2;
    const color = fading ? grey[0] : grey[1];
    drawSilhouette(ctx, feetX - 7, feetY - bob, 36, step, color);
    return;
  }

  // Идёт по синему свету лампы — на кромке синий отсвет; у порога темнеет.
  const set = fading ? sheets.dark : walking ? sheets.lit : sheets;
  if (walking) {
    // Кадр шага привязан к пройденному пути, а не ко времени:
    // ноги не скользят по полу. Лист нарисован лицом вправо.
    const [[fromX], [toX]] = girl.path;
    const walked = Math.abs(fromX - toX) * progress;
    const frame = Math.floor(walked / STEP) % frames(set.walk);
    drawFrame(ctx, set.walk, frame, feetX, feetY, toX < fromX);
    return;
  }

  // Крутит ручку: лицом вправо, рука на ручке.
  if (mode === `turn` && set.turn) {
    drawFrame(ctx, set.turn, girl.turn % frames(set.turn), feetX, feetY, false);
    return;
  }

  // Села: кадры садится по порядку, потом сидит спиной к нам, лицом к окну.
  // Встаёт — те же кадры в обратном порядке. В синем свете — на кромке
  // синий отсвет.
  if ((isSeated(girl) || mode === `rise`) && sheets.lit?.sit) {
    const last = frames(sheets.lit.sit) - 1;
    const step = Math.floor((girl.clock - girl.sitAt) / SIT_FRAME);
    const frame =
      mode === `sat`
        ? last
        : mode === `rise`
          ? Math.max(0, last - step)
          : Math.min(last, step);
    drawFrame(ctx, sheets.lit.sit, frame, feetX, feetY, false);
    return;
  }

  const sheet = mode === `wait` && set.wait ? set.wait : set.stand;
  const frame = Math.floor(time / 700) % frames(sheet);
  drawFrame(ctx, sheet, frame, feetX, feetY, false);
};
