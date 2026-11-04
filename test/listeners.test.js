import assert from "node:assert/strict";
import { test } from "node:test";

import { createListeners } from "../public/run/core.js";

// Датчики на настоящем EventTarget из Node 24: обёртка не должна ломать
// то, что браузер делает со слушателями сам.
const setup = () => {
  const log = [];
  const listeners = createListeners({
    add: EventTarget.prototype.addEventListener,
    remove: EventTarget.prototype.removeEventListener,
    on: {
      add: (target, type, id, once) => log.push([`add`, type, id, once]),
      remove: (target, type, id) => log.push([`remove`, type, id]),
      fire: (target, type, id) => log.push([`fire`, type, id]),
      done: (target, type, id, error) =>
        log.push([`done`, type, id, error ? String(error) : null]),
    },
  });
  const target = new EventTarget();
  const on = (...args) => listeners.add.apply(target, args);
  const off = (...args) => listeners.remove.apply(target, args);
  const fire = (type) => target.dispatchEvent(new Event(type));
  return { log, on, off, fire, target };
};

test(`функция, добавленная дважды, вызывается один раз`, () => {
  const { on, fire } = setup();
  let calls = 0;
  const count = () => (calls += 1);
  on(`input`, count);
  on(`input`, count);
  fire(`input`);
  assert.equal(calls, 1);
});

test(`одна функция с capture и без — два слушателя, как в браузере`, () => {
  const { on, fire } = setup();
  let calls = 0;
  const count = () => (calls += 1);
  on(`input`, count);
  on(`input`, count, true);
  fire(`input`);
  assert.equal(calls, 2);
});

test(`removeEventListener снимает слушателя`, () => {
  const { on, off, fire, log } = setup();
  let calls = 0;
  const count = () => (calls += 1);
  on(`input`, count);
  off(`input`, count);
  fire(`input`);
  assert.equal(calls, 0);
  assert.deepEqual(log.at(-1), [`remove`, `input`, 1]);
});

test(`remove с другим capture не снимает`, () => {
  const { on, off, fire } = setup();
  let calls = 0;
  const count = () => (calls += 1);
  on(`input`, count, { capture: true });
  off(`input`, count);
  fire(`input`);
  assert.equal(calls, 1);
});

test(`once срабатывает один раз`, () => {
  const { on, fire, log } = setup();
  let calls = 0;
  on(`input`, () => (calls += 1), { once: true });
  fire(`input`);
  fire(`input`);
  assert.equal(calls, 1);
  assert.deepEqual(log[0], [`add`, `input`, 1, true]);
});

test(`signal снимает слушателя и сообщает об этом`, () => {
  const { on, fire, log } = setup();
  const controller = new AbortController();
  let calls = 0;
  on(`input`, () => (calls += 1), { signal: controller.signal });
  fire(`input`);
  controller.abort();
  fire(`input`);
  assert.equal(calls, 1);
  assert.deepEqual(log.at(-1), [`remove`, `input`, 1]);
});

test(`обработчик получает this и событие, объект с handleEvent тоже`, () => {
  const { on, fire, target } = setup();
  const seen = [];
  on(`input`, function (event) {
    seen.push([this === target, event.type]);
  });
  on(`input`, {
    handleEvent(event) {
      seen.push([`object`, event.type]);
    },
  });
  fire(`input`);
  assert.deepEqual(seen, [
    [true, `input`],
    [`object`, `input`],
  ]);
});

// Сам браузер ловит ошибку слушателя и пишет её в консоль; Node отдал бы
// её раннеру тестов. Поэтому здесь обёртку зовём руками, как браузер.
test(`ошибка в обработчике летит дальше, датчик слушает дальше`, () => {
  const log = [];
  let wrapper = null;
  const listeners = createListeners({
    add: (type, fn) => (wrapper = fn),
    remove: () => {},
    on: {
      add: () => {},
      remove: () => {},
      fire: () => log.push(`fire`),
      done: (target, type, id, error) => log.push(String(error)),
    },
  });
  let calls = 0;
  listeners.add.call({}, `input`, () => {
    calls += 1;
    null.value;
  });

  const event = new Event(`input`);
  assert.throws(() => wrapper(event), /Cannot read properties of null/);
  assert.throws(() => wrapper(event), TypeError);
  assert.equal(calls, 2);
  assert.match(log[1], /^TypeError: Cannot read properties of null/);
});

test(`не функция и не строка — решает сам браузер`, () => {
  const { on, log } = setup();
  on(5, () => {});
  assert.throws(() => on(`input`, 5), TypeError);
  assert.deepEqual(log, []);
});
