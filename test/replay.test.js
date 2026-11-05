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

// Время показа — от настоящих часов: receive() сам смотрит на них.
test(`первый показ медленный: свет проседает, лампа горит на своём шаге`, () => {
  const { replay, seen } = setup();
  const { marked, events } = recording(LAMP);
  const t0 = performance.now();
  const at = (ms) => replay.update(t0 + ms);
  replay.start({ slow: true, dip: true, marked, file: FILE }, t0);
  events.forEach((event) => replay.receive(event));

  at(250);
  assert.ok(replay.view.dip > 0.5, `в середине просадки тень гуще`);
  assert.equal(replay.view.lines.size, 0, `пока свет проседает, кромок нет`);
  assert.ok(replay.view.slow);

  at(500);
  assert.ok(replay.view.dip < 1e-6, `свет вернулся`);
  assert.deepEqual([...replay.view.lines], [[1, `lit`]]);
  assert.deepEqual(seen.worlds, [`lamp`]);

  at(800);
  assert.equal(replay.view.pulses.length, 1, `поиск нашёл лампу`);
  const [flash] = seen.flashes;
  assert.deepEqual(flash.keys, [`lamp`]);
  assert.ok(Math.abs(flash.from - (t0 + 800)) < 1e-6);
  assert.ok(Math.abs(flash.until - (t0 + 1700)) < 1e-6);
  assert.deepEqual(replay.view.bright, new Set([1]));

  at(1699);
  assert.deepEqual(seen.worlds, [`lamp`], `лампа ещё не горит`);
  at(1700);
  assert.deepEqual(seen.worlds, [`lamp`, `lamp on`]);
  assert.equal(seen.slowShown, 0);

  at(2200);
  assert.equal(replay.view.slow, false);
  assert.equal(replay.view.pulses.length, 0, `поиск кончился`);
  assert.equal(replay.view.kept.length, 0, `результат не сохранён`);
  assert.equal(seen.slowShown, 1);

  // После медленного показа события идут вживую: шаг обработчика и его
  // снимок мира — в одном кадре, без медленной паузы между ними.
  replay.receive({ kind: `step`, n: 0 });
  replay.receive({ kind: `world`, world: dark });
  at(2201);
  assert.deepEqual(seen.worlds, [`lamp`, `lamp on`, `lamp`]);
});

test(`ошибка из функции выше не гасит строки начатой инструкции`, () => {
  const { replay } = setup();
  const code = `const on = (el) => el.classList.add(\`on\`);\non(document.querySelector(\`#lamb\`));`;
  const marked = instrument(code);
  replay.start({ slow: false, dip: false, marked, file: FILE }, 0);
  [
    { kind: `step`, n: 0 },
    { kind: `step`, n: 1 },
    {
      kind: `error`,
      error: { file: FILE, line: 1, column: 23, text: `TypeError: x` },
    },
    { kind: `done` },
  ].forEach((event) => replay.receive(event));
  assert.deepEqual([...replay.view.lines.keys()].sort(), [1, 2]);
});

test(`код правили после запуска — вспышки обработчика не ложатся на чужие строки`, () => {
  const { replay } = setup();
  const marked = instrument(`a();\nb();`);
  replay.start({ slow: false, dip: false, marked, file: FILE }, 0);
  replay.receive({ kind: `done` });
  replay.clearLines();
  replay.receive({ kind: `step`, n: 1 });
  assert.equal(replay.view.flashes.size, 0);
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

test(`шум измеряется: поиск внутри обработчика считается на каждое событие`, () => {
  const { replay, seen } = setup();
  const code = `document\n  .querySelector(\`#frame-picker\`)\n  .addEventListener(\`input\`, () => {\n    document.querySelector(\`.frame\`).id;\n  });`;
  const marked = instrument(code);
  const rect = { x: 62, y: 20, width: 56, height: 29 };
  replay.start({ slow: false, dip: false, marked, file: FILE }, 0);
  replay.receive({
    kind: `listen`,
    key: `picker`,
    rect,
    type: `input`,
    id: 1,
    once: false,
  });
  replay.receive({ kind: `done` });

  const turn = (found) => {
    replay.receive({ kind: `event`, key: `picker`, type: `input`, id: 1 });
    if (found) {
      replay.receive({
        kind: `find`,
        file: FILE,
        line: 4,
        column: 14,
        count: 1,
        keys: [`frame`],
        rects: [rect],
      });
    }
    replay.receive({ kind: `handled`, id: 1 });
  };

  turn(true);
  assert.equal(replay.view.finds, 1, `код новичка: один поиск на событие`);
  assert.equal(seen.flashes.at(-1).keys[0], `frame`, `табличка вспыхнула`);
  const flashes = seen.flashes.length;

  turn(false);
  assert.equal(replay.view.finds, 0, `код профи: ноль, тихо`);
  assert.equal(seen.flashes.length, flashes, `ничего не вспыхнуло`);
});

test(`зачем лесенка: в ней искрит одно звено, однострочник гаснет весь`, () => {
  const failAt = (code, line) => {
    const { replay } = setup();
    const marked = instrument(code);
    replay.start({ slow: false, dip: false, marked, file: FILE }, 0);
    [
      { kind: `step`, n: 0 },
      {
        kind: `error`,
        error: { file: FILE, line, column: 3, text: `TypeError: x` },
      },
      { kind: `done` },
    ].forEach((event) => replay.receive(event));
    return replay.view;
  };

  const ladder = failAt(`a\n  .b()\n  .c()\n  .d();`, 3);
  assert.ok(ladder.flashes.has(3), `искрит звено, где упало`);
  assert.equal(ladder.flashes.has(2), false);
  assert.equal(ladder.lines.has(4), false, `ниже — темно`);

  const oneLine = failAt(`a.b().c().d();`, 1);
  assert.equal(oneLine.lines.size, 0, `вся строка погасла`);
  assert.equal(oneLine.flashes.size, 0);
});
