import assert from "node:assert/strict";
import { test } from "node:test";

import { instrument } from "../src/code/instrument.js";
import { createReplay, pulseActive } from "../src/trace/replay.js";

// Показ по шагам с подставным временем: что видно в какую миллисекунду.
const FILE = `lamp.js`;
const dark = {
  room: { present: true },
  things: { lamp: { className: `lamp` } },
};
const lit = {
  room: { present: true },
  things: { lamp: { className: `lamp on` } },
};
const rect = { x: 86, y: 35, width: 14, height: 20 };

const setup = () => {
  const seen = { worlds: [], errors: [], flashes: [], slowShown: 0 };
  const replay = createReplay({
    onWorld: (world) => seen.worlds.push(world.things.lamp.className),
    onError: (error) => seen.errors.push(error.text),
    onFlash: (keys, from, until) => seen.flashes.push({ keys, from, until }),
    onSlowShown: () => {
      seen.slowShown += 1;
    },
  });
  return { replay, seen };
};

// Запись агента для кода: шаг, поиск, изменение, конец. Столбец поиска —
// как в стеке V8: по имени метода в размеченном коде.
const recording = (code, { found = true } = {}) => {
  const marked = instrument(code);
  const line = code.split(`\n`).findIndex((l) => l.includes(`querySelector`));
  const column = marked.code.split(`\n`)[line].indexOf(`querySelector`) + 1;
  return {
    marked,
    events: [
      { kind: `world`, world: dark },
      { kind: `step`, n: 0 },
      {
        kind: `find`,
        file: FILE,
        line: line + 1,
        column,
        count: found ? 1 : 0,
        keys: found ? [`lamp`] : [],
        rects: found ? [rect] : [],
      },
      ...(found ? [{ kind: `change`, world: lit }] : []),
      ...(found
        ? []
        : [
            {
              kind: `error`,
              error: {
                file: FILE,
                line: 1,
                column: 32,
                text: `TypeError: Cannot read properties of null (reading 'classList')`,
              },
            },
          ]),
      { kind: `done` },
    ],
  };
};

const LAMP = `document.querySelector(\`#lamp\`).classList.add(\`on\`);`;

test(`первый показ медленный: свет проседает, лампа горит на своём шаге`, () => {
  const { replay, seen } = setup();
  const { marked, events } = recording(LAMP);
  replay.start({ slow: true, dip: true, marked, file: FILE }, 0);
  events.forEach((event) => replay.receive(event));

  replay.update(250);
  assert.ok(replay.view.dip > 0.5, `в середине просадки тень гуще`);
  assert.equal(replay.view.lines.size, 0, `пока свет проседает, кромок нет`);
  assert.ok(replay.view.slow);

  replay.update(500);
  assert.equal(replay.view.dip, 0);
  assert.deepEqual([...replay.view.lines], [[1, `lit`]]);
  assert.deepEqual(seen.worlds, [`lamp`]);

  replay.update(800);
  assert.equal(replay.view.pulses.length, 1, `импульс побежал к лампе`);
  assert.deepEqual(seen.flashes, [{ keys: [`lamp`], from: 800, until: 1700 }]);
  assert.deepEqual(replay.view.bright, new Set([1]));

  replay.update(1699);
  assert.deepEqual(seen.worlds, [`lamp`], `лампа ещё не горит`);
  replay.update(1700);
  assert.deepEqual(seen.worlds, [`lamp`, `lamp on`]);
  assert.equal(seen.slowShown, 0);

  replay.update(2200);
  assert.equal(replay.view.slow, false);
  assert.equal(replay.view.pulses.length, 0, `импульс погас`);
  assert.equal(
    replay.view.kept.length,
    0,
    `результат не сохранён — провод не висит`,
  );
  assert.equal(seen.slowShown, 1);
});

test(`второй показ — сразу, без импульсов; сохранённый результат держит провод`, () => {
  const { replay, seen } = setup();
  const code = `const lamp = document.querySelector(\`#lamp\`);\nlamp.classList.add(\`on\`);`;
  const { marked, events } = recording(code);
  replay.start({ slow: false, dip: false, marked, file: FILE }, 0);
  events.forEach((event) => replay.receive(event));

  assert.deepEqual(seen.worlds, [`lamp`, `lamp on`]);
  assert.equal(replay.view.pulses.length, 0);
  assert.equal(replay.view.kept.length, 1);
  assert.equal(seen.slowShown, 0);
});

test(`клавиша пропускает показ: всё, что осталось, — сразу`, () => {
  const { replay, seen } = setup();
  const { marked, events } = recording(LAMP);
  replay.start(
    { slow: true, dip: true, marked, file: FILE },
    performance.now(),
  );
  events.forEach((event) => replay.receive(event));

  replay.skip();
  assert.deepEqual(seen.worlds, [`lamp`, `lamp on`]);
  assert.equal(replay.view.slow, false);
  assert.equal(replay.view.dip, 0);
  assert.equal(
    seen.slowShown,
    1,
    `пропущенный показ тоже считается показанным`,
  );
});

test(`ничего не нашлось: ошибка, строки ниже тёмные`, () => {
  const { replay, seen } = setup();
  const code = `document\n  .querySelector(\`#lamb\`)\n  .classList.add(\`on\`);\nconst x = 1;`;
  const { marked, events } = recording(code, { found: false });
  events.find(({ kind }) => kind === `error`).error.line = 3;
  replay.start({ slow: false, dip: false, marked, file: FILE }, 0);
  events.forEach((event) => replay.receive(event));

  assert.equal(replay.view.pulses.length, 0, `нечему загораться`);
  assert.equal(seen.errors.length, 1);
  assert.deepEqual([...replay.view.lines.keys()], [1, 2, 3], `строка 4 тёмная`);
});

test(`ошибка в середине инструкции гасит её строки ниже`, () => {
  const { replay } = setup();
  const code = `document\n  .querySelector(\`#lamb\`)\n  .addEventListener(\`input\`, () => {\n    x();\n  });`;
  const { marked, events } = recording(code, { found: false });
  events.find(({ kind }) => kind === `error`).error.line = 3;
  replay.start({ slow: false, dip: false, marked, file: FILE }, 0);
  events.forEach((event) => replay.receive(event));

  assert.deepEqual(
    [...replay.view.lines],
    [
      [1, `lit`],
      [2, `lit`],
      [3, `lit`],
    ],
  );
});

test(`найденная вещь горит, пока идёт поиск, и гаснет после`, () => {
  const pulse = { start: 1000 };
  assert.equal(pulseActive(pulse, 999), false);
  assert.equal(pulseActive(pulse, 1000), true);
  assert.equal(pulseActive(pulse, 1899), true);
  assert.equal(pulseActive(pulse, 1900), false);
  assert.equal(pulseActive({ start: 1000, quick: true }, 1400), false);
});
