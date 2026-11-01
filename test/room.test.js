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
