import assert from "node:assert/strict";
import { test } from "node:test";

import { createGirl, updateGirl } from "../src/girl/girl.js";
import {
  createScenario,
  windowFollows,
} from "../src/rooms/frame-room/scenario.js";

// Её проверка на подделке мира: ручка и окно — обычные значения, поведение
// окна задаёт сам тест. Время идёт шагами по 1/60 секунды.
const STEP = 1 / 60;
const rgb = (hex) =>
  `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(`, `)})`;

const setup = ({ onTurn = () => {} } = {}) => {
  const world = {
    room: { present: true },
    things: {
      picker: { present: true, value: `#33475f` },
      frame: { present: true, background: `rgba(0, 0, 0, 0)` },
    },
  };
  const turns = [];
  const outcomes = [];
  const girl = createGirl([
    [175, 92],
    [283, 81],
  ]);
  const scenario = createScenario({
    girl,
    turnKnob: (value, event) => {
      turns.push(event);
      if (value !== undefined) {
        world.things.picker.value = value;
        onTurn(world, value);
      }
    },
    onOutcome: (kind) => outcomes.push(kind),
  });
  const sensors = new Map();
  const run = (seconds, status = {}) => {
    for (let t = 0; t < seconds; t += STEP) {
      scenario.update({
        dt: STEP,
        world,
        sensors,
        showDone: true,
        failed: false,
        ...status,
      });
      updateGirl(girl, { ready: false }, STEP);
    }
  };
  return { world, turns, outcomes, girl, scenario, sensors, run };
};

test(`цвет окна сравнивается с настоящим значением ручки`, () => {
  const thing = { present: true, background: `rgb(58, 110, 165)` };
  assert.equal(windowFollows(thing, `#3a6ea5`), true);
  assert.equal(windowFollows(thing, `#1f2f45`), false);
  assert.equal(
    windowFollows({ present: true, background: `rgba(0, 0, 0, 0)` }, `#000000`),
    false,
  );
});

test(`шаг 0: до кода она подходит, щёлкает ручкой и опускает руку`, () => {
  const { turns, girl, scenario, run } = setup();
  scenario.enter(false);
  run(6);
  assert.equal(girl.mode, `wait`);
  assert.ok(turns.includes(`input`));
  assert.equal(turns.at(-1), `change`);
});

test(`окно следует за ручкой — три положения, и она садится`, () => {
  const { girl, scenario, sensors, run, turns } = setup({
    onTurn: (world, value) => {
      world.things.frame.background = rgb(value);
    },
  });
  scenario.enter(false);
  run(6);
  sensors.set(1, { type: `input` });
  scenario.run();
  run(30);
  assert.ok([`sit`, `sat`].includes(girl.mode));
  assert.ok(turns.filter((event) => event === `input`).length > 10);
});

test(`«почти»: окно горит, но за ручкой не идёт — она стоит`, () => {
  const { world, girl, scenario, run, outcomes } = setup();
  scenario.enter(false);
  run(6);
  world.things.frame.background = rgb(`#33475f`);
  scenario.run();
  run(10);
  assert.equal(girl.mode, `wait`);
  assert.deepEqual(outcomes, [`almost`]);
});

test(`тихая ошибка: датчик есть, окно не меняется — она стоит`, () => {
  const { girl, scenario, sensors, run, outcomes } = setup();
  scenario.enter(false);
  run(6);
  sensors.set(1, { type: `input` });
  scenario.run();
  run(10);
  assert.equal(girl.mode, `wait`);
  assert.deepEqual(outcomes, [`silent`]);
});

test(`запуск с ошибкой: она не пробует и ждёт`, () => {
  const { turns, scenario, run, outcomes, girl } = setup();
  scenario.enter(false);
  run(6);
  const before = turns.length;
  scenario.run();
  run(10, { failed: true });
  assert.equal(turns.length, before);
  assert.deepEqual(outcomes, []);
  assert.equal(girl.mode, `wait`);
});

test(`пока показ идёт, она не начинает`, () => {
  const { turns, scenario, run } = setup();
  scenario.enter(false);
  run(6);
  const before = turns.length;
  scenario.run();
  run(5, { showDone: false });
  assert.equal(turns.length, before);
});

test(`решено — сразу сидит, и окно снова светит`, () => {
  const { girl, scenario, run, turns, world } = setup();
  scenario.enter(true);
  run(0.1);
  assert.equal(girl.mode, `sat`);
  assert.deepEqual(turns, [`input`]);
  assert.equal(world.things.picker.value, `#9dbfe6`);
});

test(`код поменяли, пока она шла садиться — возвращается и проверяет новый`, () => {
  let follows = true;
  const { girl, scenario, sensors, run, outcomes } = setup({
    onTurn: (world, value) => {
      if (follows) world.things.frame.background = rgb(value);
    },
  });
  scenario.enter(false);
  run(6);
  sensors.set(1, { type: `input` });
  scenario.run();
  // Три положения позади, она пошла к окну.
  while (girl.then !== `sit`) run(STEP);
  assert.equal(girl.mode, `walk`);

  // Новый код окном не управляет: садиться ей теперь не с чего.
  follows = false;
  scenario.run();
  run(20);
  assert.equal(girl.mode, `wait`);
  assert.deepEqual(outcomes, [`silent`]);
});

test(`код переписали, когда она уже сидела — встаёт и проверяет заново`, () => {
  const { girl, scenario, run, turns } = setup({
    onTurn: (world, value) => {
      world.things.frame.background = rgb(value);
    },
  });
  scenario.enter(true);
  run(0.5);
  assert.equal(girl.mode, `sat`);
  const before = turns.length;

  scenario.run();
  run(40);
  assert.ok(turns.length > before + 10, `она крутила ручку`);
  assert.ok([`sit`, `sat`].includes(girl.mode));
});
