import assert from "node:assert/strict";
import { test } from "node:test";

import { createGirl, updateGirl } from "../src/girl/girl.js";
import { scripted } from "../src/tasks/scripted.js";

const STEP = 1 / 60;
const A = [40, 88];
const B = [100, 88];
const TABLE = [210, 92];

const setup = (options, { answer = null } = {}) => {
  const girl = createGirl([A, B]);
  const outcomes = [];
  const acts = [];
  const check = scripted({
    from: { at: A, pose: `stand` },
    to: { at: TABLE, pose: `stand` },
    ...options,
  })({
    girl,
    act: (message) => acts.push(message),
    trial: () => Promise.resolve(answer),
    onOutcome: (kind, note) => outcomes.push(note ?? kind),
  });
  const world = { room: { present: true }, things: {} };
  const run = async (seconds, status = {}) => {
    for (let t = 0; t < seconds; t += STEP) {
      check.update({
        dt: STEP,
        world,
        showDone: true,
        failed: false,
        code: `код`,
        ...status,
      });
      updateGirl(girl, STEP);
      // Ответ проверочного запуска приходит как настоящий промис.
      await null;
    }
  };
  return { girl, outcomes, acts, check, run, world };
};

test(`до запуска сценарий не идёт`, async () => {
  let ran = false;
  const { check, run } = setup({
    *script() {
      ran = true;
      return true;
    },
  });
  check.enter(false);
  await run(1);
  assert.equal(ran, false);
});

test(`шаги идут по очереди, а в конце она уходит и задача решена`, async () => {
  const log = [];
  const { check, run, girl, acts } = setup({
    *script(h) {
      log.push(`начала`);
      yield h.walk(B);
      log.push(`дошла ${girl.mode}`);
      h.act({ selector: `.handle` });
      yield h.wait(0.5);
      log.push(`подождала`);
      return true;
    },
  });
  check.enter(false);
  check.run();
  await run(0.1);
  assert.deepEqual(log, [`начала`]);
  await run(3.6);
  assert.deepEqual(log, [`начала`, `дошла stand`]);
  assert.deepEqual(acts, [{ selector: `.handle` }]);
  await run(1);
  assert.equal(log.at(-1), `подождала`);
  assert.equal(check.finished(), false);
  await run(10);
  assert.equal(check.finished(), true);
  assert.equal(girl.path[1][0], TABLE[0]);
});

test(`строка в конце — пометка, задача не решена`, async () => {
  const { check, run, outcomes, girl } = setup({
    // eslint-disable-next-line require-yield
    *script() {
      return `Не то.`;
    },
  });
  check.enter(false);
  check.run();
  await run(1);
  assert.deepEqual(outcomes, [`Не то.`]);
  assert.equal(check.finished(), false);
  assert.equal(girl.mode, `stand`);
});

test(`запуск с ошибкой: сценарий не начинается`, async () => {
  let ran = false;
  const { check, run } = setup({
    *script() {
      ran = true;
      return true;
    },
  });
  check.enter(false);
  check.run();
  await run(1, { failed: true });
  assert.equal(ran, false);
});

test(`пока показ идёт, сценарий ждёт`, async () => {
  let ran = false;
  const { check, run } = setup({
    *script() {
      ran = true;
      return false;
    },
  });
  check.enter(false);
  check.run();
  await run(1, { showDone: false });
  assert.equal(ran, false);
  await run(0.1);
  assert.equal(ran, true);
});

test(`новый запуск обрывает старый сценарий и возвращает её`, async () => {
  const log = [];
  const { check, run, girl } = setup({
    *script(h) {
      log.push(`раз`);
      yield h.walk(B);
      log.push(`два`);
      return false;
    },
  });
  check.enter(false);
  check.run();
  await run(0.5);
  assert.equal(girl.mode, `walk`);
  check.run();
  assert.equal(girl.mode, `stand`);
  assert.equal(girl.path[1][0], A[0]);
  await run(0.1);
  assert.deepEqual(log, [`раз`, `раз`]);
});

test(`ответ проверочного запуска приходит в сценарий`, async () => {
  let seen = null;
  const { check, run } = setup(
    {
      *script(h) {
        seen = yield h.trial({ patch: [] });
        return false;
      },
    },
    { answer: { world: `другой мир` } },
  );
  check.enter(false);
  check.run();
  await run(0.1);
  assert.deepEqual(seen, { world: `другой мир` });
});

test(`шаг 0 идёт сам до запуска, запуск его обрывает`, async () => {
  const log = [];
  const { check, run } = setup({
    *before(h) {
      log.push(`пробует`);
      yield h.wait(5);
      log.push(`допробовала`);
    },
    *script() {
      log.push(`проверка`);
      return false;
    },
  });
  check.enter(false);
  await run(0.1);
  assert.deepEqual(log, [`пробует`]);
  check.run();
  await run(0.1);
  assert.deepEqual(log, [`пробует`, `проверка`]);
});

test(`решённая задача: она там, куда ушла, и запуск её не двигает`, async () => {
  const { check, run, girl } = setup({
    *script() {
      assert.fail(`не должно начаться`);
    },
  });
  check.enter(true);
  assert.equal(girl.path[1][0], TABLE[0]);
  assert.equal(check.finished(), true);
  check.run();
  await run(0.5);
  assert.equal(girl.path[1][0], TABLE[0]);
});
