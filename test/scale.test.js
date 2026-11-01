import assert from "node:assert/strict";
import { test } from "node:test";

import { computeFrame } from "../src/screen/scale.js";

const frame = (screenWidth, screenHeight, dpr = 1) =>
  computeFrame({ screenWidth, screenHeight, dpr });

test(`окно 1280×720 при 100 % — ровно ×4, кадр во всё окно`, () => {
  assert.deepEqual(frame(1280, 720), { scale: 4, dpr: 1, x: 0, y: 0 });
});

test(`F11 на 1920×1080 — ×6`, () => {
  assert.equal(frame(1920, 1080).scale, 6);
});

test(`масштаб Windows 125 %: считаем в физических пикселях`, () => {
  // 1536×864 CSS-пикселей при 1,25 — это 1920×1080 на самом экране.
  assert.equal(frame(1920, 1080, 1.25).scale, 6);
});

test(`зум 90 % на 1600×900: точный замер даёт ×5`, () => {
  // По innerWidth вышло бы trunc(1600 / 0,9) · 0,9 = 1599 и ×4.
  assert.equal(frame(1600, 900, 0.9).scale, 5);
});

test(`окно меньше 1280×720 даёт ×3`, () => {
  assert.equal(frame(1366, 650).scale, 3);
});

test(`кадр по центру со сдвигом на целое число физических пикселей`, () => {
  const { scale, x, y } = frame(1952, 1100, 1.5);

  assert.equal(scale, 6);
  assert.ok(Number.isInteger(x) && Number.isInteger(y));
  assert.equal(x, 16);
});

test(`даже в крошечном окне множитель не меньше 1`, () => {
  assert.equal(frame(200, 100).scale, 1);
});
