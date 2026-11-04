import assert from "node:assert/strict";
import { test } from "node:test";

import { findListeners, findQueries } from "../src/code/preview.js";
import { sensorKind, socketOf } from "../src/rooms/events.js";

// Призрачный датчик, пока печатаешь (SLICE.md, этап 14).
const picker = { key: `picker`, events: [`input`, `change`, `click`] };
const frame = { key: `frame` };

test(`гнездо: есть у настоящих событий, даже без on…-свойства`, () => {
  assert.equal(socketOf(`input`), true);
  assert.equal(socketOf(`focusin`), true);
  assert.equal(socketOf(`DOMContentLoaded`), true);
});

test(`гнезда нет: опечатка, регистр, имя со словом on`, () => {
  assert.equal(socketOf(`imput`), false);
  assert.equal(socketOf(`Input`), false);
  assert.equal(socketOf(`onclick`), false);
});

test(`лампа датчика: горит, если вещь шлёт событие`, () => {
  assert.equal(sensorKind(`input`, picker), `lit`);
  assert.equal(sensorKind(`input`, frame), `dark`);
  assert.equal(sensorKind(`imput`, picker), `none`);
});

const NOVICE = [
  `document`,
  `  .querySelector(\`#frame-picker\`)`,
  `  .addEventListener(\`input\`, (evt) => {`,
  `    document.querySelector(\`.frame\`).style.backgroundColor =`,
  `      evt.target.value;`,
  `  });`,
].join(`\n`);

test(`датчик висит на поиске ручки, а не на поиске окна`, () => {
  const [listener] = findListeners(NOVICE);
  assert.equal(listener.type, `input`);
  assert.equal(NOVICE.slice(listener.from, listener.to), `input`);

  const host = findQueries(NOVICE).find(
    ({ call }) => call.from === listener.on.from && call.to === listener.on.to,
  );
  assert.equal(host.selector, `#frame-picker`);
});

test(`незакрытое имя события — датчика нет`, () => {
  assert.deepEqual(
    findListeners(`document.querySelector(\`#a\`).addEventListener(\`inp`),
    [],
  );
});

test(`имя события на ходу — датчика нет, честно`, () => {
  const code = `const type = \`input\`;\ndocument.addEventListener(type, () => {});`;
  assert.deepEqual(findListeners(code), []);
});

test(`датчик на вещи другой комнаты здесь не рисуется`, async () => {
  const { sensorRect } = await import(`../src/render/sensor.js`);
  const lamp = { key: `lamp`, rect: { x: 86, y: -145, width: 14, height: 20 } };
  assert.equal(sensorRect(lamp, null), null);
  const picker = {
    key: `picker`,
    rect: { x: 212, y: 50, width: 56, height: 24 },
  };
  assert.deepEqual(sensorRect(picker, null), picker.rect);
});
