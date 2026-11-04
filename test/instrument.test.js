import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";

import { HALT, createGuard } from "../public/run/core.js";
import { instrument } from "../src/code/instrument.js";

// Тот же V8, что в Chrome: выполняем код с метками и без, сравниваем
// текст ошибки и место. document — заглушка: querySelector находит только
// #lamp, у неё есть classList с add.
const station = () => {
  const lamp = { classList: { add: () => {} }, style: {} };
  return {
    querySelector: (selector) => (selector === `#lamp` ? lamp : null),
  };
};

const runIn = (code) => {
  const marks = [];
  const context = vm.createContext({
    document: station(),
    __s: (n) => marks.push(n),
    __g: () => {},
  });
  try {
    vm.runInContext(code, context, { filename: `player.js` });
    return { marks };
  } catch (error) {
    const [, line, column] = error.stack.match(/player\.js:(\d+):(\d+)/) ?? [];
    return { marks, text: String(error), line: +line, column: +column };
  }
};

const compare = (code) => {
  const plain = runIn(code);
  const marked = instrument(code);
  const traced = runIn(marked.code);
  return { plain, traced, marked };
};

const HEAD = `// Хочу, чтобы в щитовой загорелась лампа.\n`;

const fragments = [
  `document.querySelector(\`#lamb\`).classList.add(\`on\`);`,
  `document.querySelector(\`#lamp\`).classList.ad(\`on\`);`,
  `documnet.querySelector(\`#lamp\`);`,
  `const lamp = document.querySelector(\`#lamb\`);\nlamp.classList.add(\`on\`);`,
  `const x = 1;\nx = 2;`,
  `let a = 1; let b = a.nope.deeper;`,
  `if (true) { document.querySelector(\`#lamb\`).style.color = \`red\`; }`,
  `document\n  .querySelector(\`#frame-pickr\`)\n  .addEventListener(\`input\`, (evt) => {\n    evt.target.value;\n  });`,
  `document.querySelector(\`#frame-pickr\`).addEventListener(\`input\`, (evt) => { document.querySelector(\`.frame\`).style.backgroundColor = evt.target.value; });`,
  `for (let i = 0; i < 2; i++) { i.nope.x; }`,
];

for (const fragment of fragments) {
  test(`метки не меняют ошибку: ${fragment.split(`\n`)[0].slice(0, 40)}`, () => {
    const code = HEAD + fragment;
    const { plain, traced, marked } = compare(code);
    assert.equal(marked.code.split(`\n`).length, code.split(`\n`).length);
    assert.equal(traced.text, plain.text);
    assert.equal(traced.line, plain.line);
    if (plain.column) {
      assert.equal(marked.map(traced.line, traced.column), plain.column);
    }
  });
}

test(`опечатка в методе — дословный текст V8`, () => {
  const { traced } = compare(
    HEAD + `document.querySelector(\`#lamp\`).classList.ad(\`on\`);`,
  );
  assert.equal(
    traced.text,
    `TypeError: document.querySelector(...).classList.ad is not a function`,
  );
});

test(`#lamb с задачей в первой строке — 2:32`, () => {
  const { traced, marked } = compare(
    HEAD + `document.querySelector(\`#lamb\`).classList.add(\`on\`);`,
  );
  assert.deepEqual(
    [traced.line, marked.map(traced.line, traced.column)],
    [2, 32],
  );
});

test(`код из §4 с #frame-pickr — 4:3, однострочник — 2:39`, () => {
  const ladder = compare(HEAD + fragments[7]);
  assert.deepEqual(
    [
      ladder.traced.line,
      ladder.marked.map(ladder.traced.line, ladder.traced.column),
    ],
    [4, 3],
  );
  const oneLine = compare(HEAD + fragments[8]);
  assert.deepEqual(
    [
      oneLine.traced.line,
      oneLine.marked.map(oneLine.traced.line, oneLine.traced.column),
    ],
    [2, 39],
  );
});

test(`строка const x = 1 получает метку и кромку`, () => {
  const { marked, traced } = compare(`const x = 1;`);
  assert.deepEqual(marked.statements, [
    { n: 0, line: 1, lines: [1], waits: [] },
  ]);
  assert.deepEqual(traced.marks, [0]);
});

test(`строки тела обработчика не горят при запуске — они ждут`, () => {
  const { marked } = compare(fragments[7]);
  assert.deepEqual(marked.statements[0].lines, [1, 2, 3, 5]);
  assert.deepEqual(marked.statements[0].waits, [4]);
});

// Место вызова — как его пишет V8 в стеке обёртки агента.
const sitesOf = (code) => {
  const sites = [];
  const where = () => {
    const [, line, column] = new Error().stack.match(/player\.js:(\d+):(\d+)/);
    sites.push([+line, +column]);
    return { classList: { add: () => {} } };
  };
  const context = vm.createContext({
    document: { querySelector: where },
    __s: () => {},
  });
  vm.runInContext(instrument(code).code, context, { filename: `player.js` });
  return sites;
};

test(`вызов по месту из стека: сохранён ли результат`, () => {
  const cases = [
    [`document.querySelector(\`#lamp\`).classList.add(\`on\`);`, false, [1]],
    [`const lamp = document.querySelector(\`#lamp\`);`, true, [1]],
    [
      `let lamp;
lamp = document.querySelector(\`#lamp\`);`,
      true,
      [2],
    ],
    [
      `document
  .querySelector(\`#lamp\`)
  .classList.add(\`on\`);`,
      false,
      [1, 2],
    ],
  ];
  for (const [code, kept, lines] of cases) {
    const [[line, column]] = sitesOf(code);
    assert.deepEqual(instrument(code).callAt(line, column), { kept, lines });
  }
});

test(`без скобок после if метку не ставим — смысл кода не меняется`, () => {
  const { marked } = compare(`if (false) document.querySelector(\`#lamb\`).x;`);
  assert.equal(marked.statements.length, 1);
  assert.equal(
    compare(`if (false) document.querySelector(\`#lamb\`).x;`).traced.text,
    undefined,
  );
});

test(`код, который не разобрался, идёт без меток`, () => {
  const code = `document.querySelector(\`#lamp\`.classList.add(\`on\`);`;
  assert.equal(instrument(code).code, code);
});

// Сторож: цикл без передышки прерывается. В тесте предел 150 мс вместо 800.
const guarded = (code) => {
  const context = vm.createContext({
    __s: () => {},
    __g: createGuard(
      () => performance.now(),
      (rest) => setTimeout(rest, 0),
      { limit: 150 },
    ),
  });
  const started = performance.now();
  try {
    vm.runInContext(instrument(code).code, context);
    return { halted: false };
  } catch (error) {
    return { halted: error === HALT, took: performance.now() - started };
  }
};

for (const loop of [
  `while (true) {}`,
  `for (;;) {}`,
  `for (;;);`,
  `do {} while (true);`,
  `let x = 0;\nwhile (true) x++;`,
  `while (true) {\n  try {\n    x();\n  } catch {}\n}`,
]) {
  test(`сторож прерывает: ${loop.split(`\n`).join(` `)}`, () => {
    const { halted, took } = guarded(loop);
    assert.ok(halted, `цикл не прервался`);
    assert.ok(took < 1000, `прервался только через ${took} мс`);
  });
}

test(`конечный цикл сторож не трогает`, () => {
  assert.deepEqual(guarded(`for (let i = 0; i < 1000; i++) {}`), {
    halted: false,
  });
});

// Ручку крутят: событие каждые 16 мс, на каждом короткий цикл. Между
// событиями поток отдыхает — отсчёт каждый раз с нуля, сторож молчит.
test(`отдельные события не копятся в один отсчёт`, () => {
  let now = 0;
  const timers = [];
  const guard = createGuard(
    () => now,
    (rest) => timers.push(rest),
    { limit: 800 },
  );
  for (let event = 0; event < 200; event++) {
    for (let i = 0; i < 3; i++) guard();
    timers.splice(0).forEach((rest) => rest());
    now += 16;
  }
  assert.equal(now, 3200);
});

test(`пойманный HALT не спасает, пока поток не отдохнул`, () => {
  let now = 0;
  const guard = createGuard(
    () => now,
    () => {},
    { limit: 100 },
  );
  while (now <= 100) {
    guard();
    now += 10;
  }
  assert.throws(guard, (error) => error === HALT);
  now += 10;
  assert.throws(guard, (error) => error === HALT);
});

test(`скобки вокруг тела без скобок не меняют смысл`, () => {
  const code = `let a = 0;\nif (a) while (a) a--; else a = 5;\na;`;
  const context = vm.createContext({ __s: () => {}, __g: () => {} });
  assert.equal(vm.runInContext(instrument(code).code, context), 5);
});

test(`столбцы правее сторожа возвращаются на место`, () => {
  const code = `while (true) { document.querySelector(\`#lamb\`).x.y; }`;
  const { plain, traced, marked } = compare(code);
  assert.equal(
    traced.text,
    `TypeError: Cannot read properties of null (reading 'x')`,
  );
  assert.equal(marked.map(traced.line, traced.column), plain.column);
});

test(`решённый файл станции: сторож в циклах, без меток показа`, async () => {
  const { guardLoops } = await import(`../src/code/instrument.js`);
  const code = `document.querySelector(\`#lamp\`).classList.add(\`on\`);\nwhile (true) {}`;
  const guardedCode = guardLoops(code);
  assert.ok(!guardedCode.includes(`__s(`));
  assert.ok(guardedCode.includes(`__g();`));
  assert.equal(guardedCode.split(`\n`).length, 2);
  assert.equal(guardLoops(`while (`), `while (`);
});
