import assert from "node:assert/strict";
import { test } from "node:test";

import {
  bindThings,
  callSite,
  locate,
  matchSelectors,
  readThing,
  snapshot,
} from "../public/run/core.js";

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

test(`место вызова: первый кадр из blob, кадры агента пропущены`, () => {
  const stack = `Error
    at found (http://127.0.0.1:5173/run/agent.js:240:24)
    at HTMLDocument.querySelector (http://127.0.0.1:5173/run/agent.js:251:15)
    at ${URL}:2:10`;
  assert.deepEqual(callSite(stack), { url: URL, line: 2, column: 10 });
});

test(`место вызова: Firefox и стек без кода игрока`, () => {
  assert.deepEqual(
    callSite(`found@http://127.0.0.1:5173/run/agent.js:240:24
@${URL}:3:4
`),
    {
      url: URL,
      line: 3,
      column: 4,
    },
  );
  assert.equal(
    callSite(`Error
    at http://127.0.0.1:5173/run/agent.js:1:1`),
    null,
  );
  assert.equal(callSite(undefined), null);
});

const fakeRead = {
  isConnected: (element) => element.connected,
  id: (element) => element.id,
  tag: (element) => element.tag,
  className: (element) => element.className,
  background: (element) => element.background,
  value: (element) => element.value,
  rect: (element) => element.rect,
};

const lamp = {
  connected: true,
  id: `lamp`,
  tag: `<div id="lamp" class="lamp on">`,
  className: `lamp on`,
  background: `rgb(87, 154, 243)`,
  rect: { x: 112, y: 33, width: 7, height: 9 },
};

test(`снимок вещи: id, классы, цвет и рамка из вёрстки`, () => {
  assert.deepEqual(readThing(lamp, fakeRead), {
    present: true,
    id: `lamp`,
    tag: `<div id="lamp" class="lamp on">`,
    className: `lamp on`,
    background: `rgb(87, 154, 243)`,
    value: undefined,
    rect: { x: 112, y: 33, width: 7, height: 9 },
  });
});

test(`у поля ввода в снимке его значение`, () => {
  const picker = { ...lamp, id: `frame-picker`, value: `#33475f` };
  assert.equal(readThing(picker, fakeRead).value, `#33475f`);
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
  const renamed = { ...lamp };
  const boundRenamed = bindThings(things, () => renamed);
  renamed.id = `x`;
  const { lamp: seen } = snapshot(things, boundRenamed, fakeRead);
  assert.equal(seen.present, true);
  assert.equal(seen.id, `x`);
  assert.ok(bound.lamp);
});

test(`превью: сколько нашлось, где и какие это вещи`, () => {
  const door = { rect: { x: 34, y: 40, width: 22, height: 38 } };
  const queryAll = (selector) => {
    if (selector === `#lamp`) return [lamp];
    if (selector === `div`) return [lamp, door];
    if (selector === `#`) throw new SyntaxError(`'#' is not a valid selector`);
    return [];
  };
  const keyOf = (element) => (element === lamp ? `lamp` : undefined);

  assert.deepEqual(
    matchSelectors([`#lamp`, `#lam`, `div`, `#`], queryAll, fakeRead, keyOf),
    [
      { valid: true, count: 1, rects: [lamp.rect], keys: [`lamp`] },
      { valid: true, count: 0, rects: [], keys: [] },
      {
        valid: true,
        count: 2,
        rects: [lamp.rect, door.rect],
        keys: [`lamp`, null],
      },
      { valid: false, count: 0, rects: [], keys: [] },
    ],
  );
});
