import assert from "node:assert/strict";
import { test } from "node:test";

import { createGirl, goTo, placeGirl, updateGirl } from "../src/girl/girl.js";
import { snapshotCheck } from "../src/tasks/check.js";

const STEP = 1 / 60;
const STRIP = [160, 92];
const DOOR = [68, 84];

const setup = ({ from, to, test: judge }) => {
  const girl = createGirl([STRIP, DOOR]);
  const outcomes = [];
  const check = snapshotCheck({ from, to, test: judge })({
    girl,
    onOutcome: (kind, note) => outcomes.push([kind, note]),
  });
  const run = (seconds, status = {}) => {
    for (let t = 0; t < seconds; t += STEP) {
      check.update({
        world: {},
        showDone: true,
        failed: false,
        ...status,
      });
      updateGirl(girl, STEP);
    }
  };
  return { girl, outcomes, check, run };
};

const WALK = {
  from: { at: STRIP, pose: `stand` },
  to: { at: DOOR, pose: `wait` },
};

test(`пока запуска не было, она не проверяет`, () => {
  const { girl, outcomes, check, run } = setup({ ...WALK, test: () => true });
  check.enter(false);
  run(1);
  assert.equal(girl.mode, `stand`);
  assert.deepEqual(outcomes, []);
  assert.equal(check.finished(), false);
});

test(`мир как надо — идёт, а когда дошла, задача решена`, () => {
  const { girl, check, run } = setup({ ...WALK, test: () => true });
  check.enter(false);
  check.run();
  run(0.1);
  assert.equal(girl.mode, `walk`);
  assert.equal(check.finished(), false);
  run(20);
  assert.equal(girl.mode, `wait`);
  assert.equal(check.finished(), true);
});

test(`пока показ идёт или автомат выбит, она не идёт`, () => {
  const { girl, check, run } = setup({ ...WALK, test: () => true });
  check.enter(false);
  check.run();
  run(1, { showDone: false });
  assert.equal(girl.mode, `stand`);
  run(1, { failed: true });
  assert.equal(girl.mode, `stand`);
});

test(`«почти»: говорит один раз за запуск и своей строкой`, () => {
  const { girl, outcomes, check, run } = setup({
    ...WALK,
    test: () => `Написано не то.`,
  });
  check.enter(false);
  check.run();
  run(1);
  assert.equal(girl.mode, `stand`);
  assert.deepEqual(outcomes, [[`almost`, `Написано не то.`]]);
  check.run();
  run(1);
  assert.equal(outcomes.length, 2);
});

test(`запуск, пока она шла, — снова там, откуда пробовала`, () => {
  let good = true;
  const { girl, check, run } = setup({ ...WALK, test: () => good });
  check.enter(false);
  check.run();
  run(1);
  assert.equal(girl.mode, `walk`);
  good = false;
  check.run();
  run(0.1);
  assert.equal(girl.mode, `stand`);
  assert.equal(check.finished(), false);
});

test(`решённая задача: уже там, куда ушла, запуск её не двигает`, () => {
  const { girl, check, run } = setup({ ...WALK, test: () => false });
  check.enter(true);
  assert.equal(girl.mode, `wait`);
  assert.equal(check.finished(), true);
  check.run();
  run(1);
  assert.equal(girl.mode, `wait`);
});

test(`садится на месте, и решено, только когда села`, () => {
  const { girl, check, run } = setup({
    from: { at: DOOR, pose: `wait` },
    to: { at: DOOR, pose: `sit` },
    test: () => true,
  });
  check.enter(false);
  check.run();
  run(0.1);
  assert.equal(girl.mode, `sit`);
  assert.equal(check.finished(), false);
  run(3);
  assert.equal(girl.mode, `sat`);
  assert.equal(check.finished(), true);
});

test(`с пола сначала встаёт, потом идёт`, () => {
  const { girl, check, run } = setup({
    from: { at: DOOR, pose: `sit` },
    to: { at: [68, 81], pose: `wait` },
    test: () => true,
  });
  check.enter(false);
  assert.equal(girl.mode, `sat`);
  check.run();
  run(0.1);
  assert.equal(girl.mode, `rise`);
  run(10);
  assert.equal(girl.mode, `wait`);
  assert.equal(check.finished(), true);
});

test(`скрывается за порогом: режим gone`, () => {
  const girl = createGirl([STRIP, DOOR]);
  placeGirl(girl, DOOR, `wait`);
  goTo(girl, [68, 81], `gone`);
  assert.equal(girl.mode, `walk`);
  for (let i = 0; i < 120; i += 1) updateGirl(girl, STEP);
  assert.equal(girl.mode, `gone`);
});
