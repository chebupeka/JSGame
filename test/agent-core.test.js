import assert from "node:assert/strict";
import { test } from "node:test";

import { bindThings, locate, readThing, snapshot } from "../public/run/core.js";

const URL = `blob:http://127.0.0.1:5173/4b0f2c1e-9d7a-4e2b-8f1a-1c2d3e4f5a6b`;

test(`стек V8: ошибка на верхнем уровне модуля`, () => {
  const stack = `TypeError: Cannot read properties of null (reading 'classList')\n    at ${URL}:2:31`;
  assert.deepEqual(locate(stack, URL), { line: 2, column: 31 });
});

test(`стек V8: ошибка внутри функции`, () => {
  const stack = `TypeError: x is not a function\n    at paint (${URL}:7:5)\n    at ${URL}:9:1`;
  assert.deepEqual(locate(stack, URL), { line: 7, column: 5 });
});

test(`стек Firefox`, () => {
  const stack = `paint@${URL}:4:3\n@${URL}:6:1\n`;
  assert.deepEqual(locate(stack, URL), { line: 4, column: 3 });
});

test(`чужой файл в стеке не считается местом ошибки`, () => {
  const stack = `Error\n    at blob:http://127.0.0.1:5173/other:1:1`;
  assert.equal(locate(stack, URL), null);
});

test(`у SyntaxError и у брошенной строки места нет`, () => {
  assert.equal(locate(`SyntaxError: Unexpected token ')'`, URL), null);
  assert.equal(locate(undefined, URL), null);
});

const fakeRead = {
  isConnected: (element) => element.connected,
  className: (element) => element.className,
  background: (element) => element.background,
  rect: (element) => element.rect,
};

const lamp = {
  connected: true,
  className: `lamp on`,
  background: `rgb(87, 154, 243)`,
  rect: { x: 112, y: 33, width: 7, height: 9 },
};

test(`снимок вещи: классы, цвет и рамка из вёрстки`, () => {
  assert.deepEqual(readThing(lamp, fakeRead), {
    present: true,
    className: `lamp on`,
    background: `rgb(87, 154, 243)`,
    rect: { x: 112, y: 33, width: 7, height: 9 },
  });
});

test(`вещи нет или её сняли со страницы`, () => {
  assert.deepEqual(readThing(null, fakeRead), { present: false });
  assert.deepEqual(readThing({ ...lamp, connected: false }, fakeRead), {
    present: false,
  });
});

test(`вещи привязаны к элементам, а не к селекторам`, () => {
  const things = [{ key: `lamp`, selector: `#lamp` }];
  const bound = bindThings(things, (selector) =>
    selector === `#lamp` ? lamp : null,
  );

  // Игрок сменил id: селектор больше не найдёт лампу, а снимок найдёт.
  lamp.id = `x`;
  assert.equal(snapshot(things, bound, fakeRead).lamp.present, true);
});
