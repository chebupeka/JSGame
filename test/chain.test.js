import assert from "node:assert/strict";
import { test } from "node:test";

import {
  entryCode,
  filesFor,
  firstOpen,
  monitorsOf,
  nextOf,
  withoutBrief,
} from "../src/tasks/chain.js";

const TASKS = [
  { id: `one`, file: `a.js` },
  { id: `two`, file: `b.js` },
  { id: `three`, file: `a.js` },
  { id: `four`, file: `c.js` },
];

test(`открыта первая нерешённая, а если решено всё — последняя`, () => {
  assert.equal(firstOpen(TASKS, {}).id, `one`);
  assert.equal(firstOpen(TASKS, { one: true, two: true }).id, `three`);
  const all = { one: true, two: true, three: true, four: true };
  assert.equal(firstOpen(TASKS, all).id, `four`);
});

test(`следующая задача — по порядку, после последней её нет`, () => {
  assert.equal(nextOf(TASKS, TASKS[1]).id, `three`);
  assert.equal(nextOf(TASKS, TASKS[3]), null);
});

test(`файлы идут в порядке появления, правка старого не двигает его`, () => {
  const files = { "a.js": `A`, "b.js": `B` };
  assert.deepEqual(filesFor(TASKS, TASKS[2], files, `A2`), [
    { name: `a.js`, code: `A2` },
    { name: `b.js`, code: `B` },
  ]);
});

test(`файлы задач впереди не работают`, () => {
  const files = { "a.js": `A`, "b.js": `B`, "c.js": `C` };
  assert.deepEqual(
    filesFor(TASKS, TASKS[1], files).map(({ name }) => name),
    [`a.js`, `b.js`],
  );
});

test(`нерешённый файл без своего кода не запускается`, () => {
  assert.deepEqual(filesFor(TASKS, TASKS[0], {}), []);
  assert.deepEqual(filesFor(TASKS, TASKS[0], {}, `A`), [
    { name: `a.js`, code: `A` },
  ]);
});

test(`мониторов столько, сколько файлов, пустые — null`, () => {
  assert.deepEqual(monitorsOf(TASKS, { "b.js": `B` }), [null, `B`, null]);
});

test(`«Дано» прошлой задачи снимается, твой код остаётся целым`, () => {
  const code = `// Хочу свет.\n//\n// Дано:\n\nconst a = 1;\n// моё\na += 1;\n`;
  assert.equal(withoutBrief(code), `const a = 1;\n// моё\na += 1;\n`);
  assert.equal(withoutBrief(`// только заметки\n`), ``);
});

test(`при входе — новое «Дано», под ним твой код`, () => {
  const task = { file: `a.js`, code: `// Новое.\n` };
  assert.equal(entryCode(task, {}), `// Новое.\n`);
  assert.equal(
    entryCode(task, { "a.js": `// Старое.\nfoo();\n` }),
    `// Новое.\nfoo();\n`,
  );
});
