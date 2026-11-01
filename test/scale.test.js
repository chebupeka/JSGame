import assert from "node:assert/strict";
import { test } from "node:test";

import { computeFrame } from "../src/screen/scale.js";

test(`окно 1280×720 при 100 % — ровно ×4, кадр во всё окно`, () => {
  assert.deepEqual(computeFrame({ width: 1280, height: 720, dpr: 1 }), {
    scale: 4,
    dpr: 1,
    x: 0,
    y: 0,
  });
});

test(`F11 на 1920×1080 — ×6`, () => {
  assert.equal(computeFrame({ width: 1920, height: 1080, dpr: 1 }).scale, 6);
});

test(`масштаб Windows 125 %: считаем в физических пикселях`, () => {
  // 1536×864 CSS-пикселей при 1,25 — это 1920×1080 на самом экране.
  assert.equal(computeFrame({ width: 1536, height: 864, dpr: 1.25 }).scale, 6);
});

test(`окно меньше 1280×720 даёт ×3`, () => {
  assert.equal(computeFrame({ width: 1366, height: 650, dpr: 1 }).scale, 3);
});

test(`кадр по центру со сдвигом на целое число физических пикселей`, () => {
  const { scale, x, y } = computeFrame({ width: 1301, height: 733, dpr: 1.5 });

  assert.equal(scale, 6);
  assert.ok(Number.isInteger(x) && Number.isInteger(y));
  assert.equal(x, 16);
});

test(`даже в крошечном окне множитель не меньше 1`, () => {
  assert.equal(computeFrame({ width: 200, height: 100, dpr: 1 }).scale, 1);
});
