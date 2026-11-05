import { hasClass } from "../switchboard/things.js";
import { ARCHIVE } from "./backdrop.js";

// Что она умеет в архиве. Она стоит слева от ящика: рука на кадре «крутить» —
// на 10 пикселей правее ног и на 27 выше, как раз до ручки. Тянуть ящик —
// настоящий click() по его ручке: щелчок доходит и до самого ящика.
const FLOOR = 88;
const REACH = 10;

export const TABLE = [210, 92];
export const STRIP = [
  ARCHIVE.shutter.x + Math.round(ARCHIVE.shutter.w / 2),
  92,
];

const atDrawer = (n) => {
  const { x, w } = ARCHIVE.drawer(n);
  return [x + Math.round(w / 2) - REACH, FLOOR];
};

// Где она стоит, когда читает табло над полкой.
export const UNDER_TAG = [
  ARCHIVE.tagBoard.x + Math.round(ARCHIVE.tagBoard.w / 2),
  FLOOR,
];

export const handleOf = (n) => `.drawer[data-n="${n}"] .handle`;
const NUMBERS = [1, 2, 3, 4, 5, 6];

export const drawerOf = (world, n) => world.things[`drawer${n}`];
export const isOpen = (world, n) => hasClass(drawerOf(world, n), `open`);
export const isLocked = (world, n) => hasClass(drawerOf(world, n), `locked`);
export const opened = (world) => NUMBERS.filter((n) => isOpen(world, n));
export const countOf = (world, n) =>
  drawerOf(world, n).tag.match(/data-count="([^"]*)"/)?.[1];

// Потрогать ящик, не дёргая: рука на нём, щелчка нет.
export function* touch(h, n) {
  yield h.walk(atDrawer(n));
  h.girl.mode = `turn`;
  h.girl.turn += 1;
  yield h.wait(0.35);
  h.girl.mode = `stand`;
}

// Потянуть за ручку: настоящий щелчок.
export function* pull(h, n) {
  yield h.walk(atDrawer(n));
  h.girl.mode = `turn`;
  h.girl.turn += 1;
  h.act({ selector: handleOf(n), event: `click` });
  h.sound(`drawer`, ARCHIVE.drawer(n));
  yield h.wait(0.5);
  h.girl.mode = `stand`;
}

// Обойти полку: из выдвинутых взять находки и отнести на стол.
export function* collect(h, numbers = NUMBERS) {
  let taken = 0;
  for (const n of numbers) {
    const world = h.world();
    if (!isOpen(world, n)) continue;
    yield* touch(h, n);
    if (isLocked(world, n)) continue;
    const here = Number(countOf(world, n));
    if (!here) continue;
    taken += here;
    h.girl.carrying = true;
  }
  yield h.walk(TABLE);
  h.girl.carrying = false;
  h.girl.onTable = taken;
}

// Тянет ящик и читает табло над полкой: что на нём после рывка.
export function* pullAndRead(h, n) {
  yield* pull(h, n);
  yield h.walk(UNDER_TAG);
  yield h.wait(0.3);
  return h.world().things.tagBoard.text.trim();
}
