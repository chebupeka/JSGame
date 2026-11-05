import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import layout from "../assets/sprites/bg-switchroom.json" with { type: "json" };

// CSS станции и картинка фона должны говорить об одних и тех же местах:
// рамка лампы из настоящей вёрстки должна лечь ровно на крепление на стене.
const css = readFileSync(
  new URL(`../src/rooms/switchboard/room.css`, import.meta.url),
  `utf8`,
);

const box = (selector) => {
  const block = css.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))[1];
  const value = (name) =>
    Number(block.match(new RegExp(`${name}:\\s*(\\d+)px`))[1]);
  return {
    x: value(`left`),
    y: value(`top`),
    w: value(`width`),
    h: value(`height`),
  };
};

test(`лампа в CSS стоит на креплении с картинки`, () => {
  assert.deepEqual(box(`.lamp`), { ...layout.lampMount, w: 14, h: 20 });
});

test(`дверь в CSS совпадает с проёмом на картинке`, () => {
  assert.deepEqual(box(`.door`), layout.door);
});

// Комната с фальш-окном: окна, дверь и ручка в CSS — там же, где на фоне.
const frameCss = readFileSync(
  new URL(`../src/rooms/frame-room/room.css`, import.meta.url),
  `utf8`,
);
const { FRAME_ROOM } = await import(`../src/rooms/frame-room/backdrop.js`);

const frameBox = (selector) => {
  const at = frameCss.indexOf(`${selector} {`);
  const block = frameCss.slice(at, frameCss.indexOf(`}`, at));
  const value = (name) =>
    Number(block.match(new RegExp(`${name}:\\s*(\\d+)px`))[1]);
  return {
    x: value(`left`),
    y: value(`top`),
    w: value(`width`),
    h: value(`height`),
  };
};

test(`окна, дверь и ручка в CSS — на своих местах фона`, () => {
  assert.deepEqual(
    frameBox(`.frame-room > .frame:first-child`),
    FRAME_ROOM.frameBig,
  );
  assert.deepEqual(
    frameBox(`.frame-room > .door + .frame`),
    FRAME_ROOM.frameSmall,
  );
  assert.deepEqual(frameBox(`.frame-room .door`), FRAME_ROOM.doorOut);
  assert.deepEqual(frameBox(`#frame-picker`), FRAME_ROOM.knob);
});

const { SWITCHBOARD } = await import(`../src/rooms/switchboard/backdrop.js`);
const { ARCHIVE } = await import(`../src/rooms/archive/backdrop.js`);

test(`табло, лампа в проёме и плафон в CSS — там, где их рисует код`, () => {
  assert.deepEqual(box(`#board`), SWITCHBOARD.board);
  assert.deepEqual({ ...box(`.door-lamp`) }, SWITCHBOARD.doorLamp);
  assert.deepEqual(box(`.plafond`), SWITCHBOARD.plafond);
});

test(`табло у двери в CSS — над платой ручки`, () => {
  assert.deepEqual(frameBox(`#color-board`), FRAME_ROOM.colorBoard);
});

const archiveCss = readFileSync(
  new URL(`../src/rooms/archive/room.css`, import.meta.url),
  `utf8`,
);

const archiveBox = (selector) => {
  const at = archiveCss.indexOf(`${selector} {`);
  const block = archiveCss.slice(at, archiveCss.indexOf(`}`, at));
  const value = (name) =>
    Number(block.match(new RegExp(`${name}:\\s*(\\d+)px`))?.[1]);
  return {
    x: value(`left`),
    y: value(`top`),
    w: value(`width`),
    h: value(`height`),
  };
};

test(`полка и табло архива в CSS — там, где их рисует игра`, () => {
  assert.deepEqual(archiveBox(`.shelf`), ARCHIVE.shelf);
  assert.deepEqual(archiveBox(`#tag-board`), ARCHIVE.tagBoard);
  assert.deepEqual(archiveBox(`#table-board`), ARCHIVE.tableBoard);
});

test(`ящики стоят по своим гнёздам на полке`, () => {
  const { top, width, height } = {
    top: Number(archiveCss.match(/\.drawer \{[^}]*top: (\d+)px/)[1]),
    width: Number(archiveCss.match(/\.drawer \{[^}]*width: (\d+)px/)[1]),
    height: Number(archiveCss.match(/\.drawer \{[^}]*height: (\d+)px/)[1]),
  };
  [1, 2, 3, 4, 5, 6].forEach((n) => {
    const left = Number(
      archiveCss.match(
        new RegExp(`nth-child\\(${n}\\) \\{\\s*left: (\\d+)px`),
      )[1],
    );
    assert.deepEqual(
      {
        x: ARCHIVE.shelf.x + left,
        y: ARCHIVE.shelf.y + top,
        w: width,
        h: height,
      },
      ARCHIVE.drawer(n),
    );
  });
});
