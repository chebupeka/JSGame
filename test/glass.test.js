import assert from "node:assert/strict";
import { test } from "node:test";

import { glassColor, glassLevel } from "../src/render/glass.js";
import { colors } from "../src/render/palette.js";
import { knobPosition, knobTurn } from "../src/rooms/frame-room/knob.js";

// Узор стекла 4×4 для вычисленного цвета из песочницы.
const pattern = (css) => {
  const level = glassLevel(css);
  const cells = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) cells.push(glassColor(level, x, y));
  }
  return cells;
};

const lit = (cells) => cells.filter(Boolean).length;
const white = colors.at(-1);

test(`red и gray дают одинаковый узор окна`, () => {
  assert.deepEqual(pattern(`rgb(255, 0, 0)`), pattern(`rgb(128, 128, 128)`));
});

test(`чёрный — одна точка из 16, окно не мёртвое`, () => {
  assert.equal(lit(pattern(`rgb(0, 0, 0)`)), 1);
});

test(`прозрачное стекло не светит`, () => {
  assert.equal(lit(pattern(`rgba(0, 0, 0, 0)`)), 0);
  assert.equal(glassLevel(undefined), null);
});

test(`белого в окне нет ни при каком цвете`, () => {
  for (let v = 0; v <= 255; v += 15) {
    for (const css of [`rgb(${v}, ${v}, ${v})`, `rgb(${v}, 0, ${255 - v})`]) {
      assert.ok(!pattern(css).includes(white), css);
    }
  }
});

test(`чем светлее цвет, тем больше света`, () => {
  const brightness = (css) =>
    pattern(css).reduce(
      (sum, cell) => sum + (cell === null ? 0 : cell === colors[6] ? 1 : 2),
      0,
    );
  assert.ok(brightness(`rgb(60, 60, 60)`) < brightness(`rgb(160, 160, 160)`));
  assert.ok(
    brightness(`rgb(160, 160, 160)`) < brightness(`rgb(250, 250, 250)`),
  );
});

test(`ручка: поворот → цвет → тот же поворот`, () => {
  for (const p of [0, 0.25, 0.5, 0.8, 1]) {
    const value = knobTurn(p);
    assert.match(value, /^#[\da-f]{6}$/);
    assert.ok(Math.abs(knobPosition(value) - p) < 0.01, `${p} → ${value}`);
  }
});

test(`ограничитель вспышек: тьма → свет не быстрее 0,4 с`, async () => {
  const { GLOW_RATE, easeGlow } = await import(`../src/render/glow.js`);
  let shown = null;
  let time = 0;
  while (shown !== 1) {
    shown = easeGlow(shown, 1, 1 / 60, GLOW_RATE.normal);
    time += 1 / 60;
  }
  assert.ok(time >= 0.39, `разгорелось за ${time.toFixed(2)} с`);
  assert.equal(easeGlow(0.005, null, 1 / 60, GLOW_RATE.normal), null);
});
