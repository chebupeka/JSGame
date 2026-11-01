import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ladder,
  luminance,
  parseRgb,
  pickColor,
} from "../src/render/ladder.js";

const pattern = (rgb) => {
  const lum = luminance(rgb);
  const cells = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) cells.push(pickColor(lum, x, y));
  }
  return cells;
};

const count = (cells, hex) => cells.filter((cell) => cell === hex).length;

test(`red и gray дают одинаковый узор: 8 из 16 между #49607E и #579AF3`, () => {
  const red = pattern([255, 0, 0]);
  const gray = pattern([128, 128, 128]);

  assert.deepEqual(red, gray);
  assert.equal(count(red, `#579AF3`), 8);
  assert.equal(count(red, `#49607E`), 8);
});

test(`чёрный — самый тёмный серый, белый — белый`, () => {
  assert.equal(count(pattern([0, 0, 0]), `#1B1B1B`), 16);
  assert.equal(count(pattern([255, 255, 255]), `#FFFFFF`), 16);
});

test(`цвет палитры остаётся собой`, () => {
  assert.equal(count(pattern([0x57, 0x9a, 0xf3]), `#579AF3`), 16);
  assert.equal(count(pattern([0x34, 0x36, 0x38]), `#343638`), 16);
});

test(`чем светлее, тем больше светлых точек`, () => {
  const { low, high } = ladder(luminance([100, 140, 200]));
  const darker = count(pattern([90, 130, 190]), high);
  const lighter = count(pattern([110, 150, 210]), high);

  assert.ok(low !== high);
  assert.ok(lighter >= darker);
});

test(`вычисленный цвет из песочницы разбирается`, () => {
  assert.deepEqual(parseRgb(`rgb(87, 154, 243)`), [87, 154, 243]);
  assert.deepEqual(parseRgb(`rgba(255, 0, 0, 0.5)`), [255, 0, 0]);
});
