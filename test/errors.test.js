import assert from "node:assert/strict";
import { test } from "node:test";

import { closest, distance, explainError } from "../src/code/errors.js";

const STATION = {
  ids: [`lamp`],
  classes: [`room`, `lamp`, `door`],
  labels: { lamp: `на лампе` },
};

const explain = (text, extra = {}) =>
  explainError(
    { text, line: 8, column: 31 },
    { ...STATION, code: ``, ...extra },
  );

const terms = ({ parts }) => parts.map(([term]) => term);

test(`расстояние между словами`, () => {
  assert.equal(distance(`lamb`, `lamp`), 1);
  assert.equal(distance(`documnet`, `document`), 2);
  assert.equal(closest(`lamb`, [`lamp`, `door`]), `lamp`);
  assert.equal(closest(`xyz`, [`lamp`]), null);
});

test(`свойство у null — Chrome, с «похоже на» по id станции`, () => {
  const result = explain(
    `TypeError: Cannot read properties of null (reading 'classList')`,
    { typed: [`#lamb`] },
  );
  assert.deepEqual(terms(result), [
    `TypeError`,
    `Cannot read properties of null`,
    `(reading 'classList')`,
  ]);
  assert.deepEqual(result.sentences, [
    `querySelector ничего не нашёл и вернул null.`,
    `На лампе выбито \`lamp\`, у тебя \`lamb\`.`,
  ]);
});

test(`свойство у null — Firefox`, () => {
  const result = explain(
    `TypeError: can't access property "classList", document.querySelector(...) is null`,
    { typed: [`#lamb`] },
  );
  assert.equal(terms(result)[1], `can't access property "classList"`);
  assert.equal(
    result.sentences[1],
    `На лампе выбито \`lamp\`, у тебя \`lamb\`.`,
  );
});

test(`опечатка в методе — Chrome и Firefox пишут одинаково`, () => {
  const result = explain(
    `TypeError: document.querySelector(...).classList.ad is not a function`,
  );
  assert.equal(
    terms(result)[1],
    `document.querySelector(...).classList.ad is not a function`,
  );
  assert.deepEqual(result.sentences, [`Метода \`ad\` нет. Похоже на \`add\`.`]);
});

test(`необъявленное имя`, () => {
  const result = explain(`ReferenceError: documnet is not defined`);
  assert.deepEqual(terms(result), [
    `ReferenceError`,
    `documnet is not defined`,
  ]);
  assert.deepEqual(result.sentences, [`Похоже на \`document\`.`]);
});

test(`забытая скобка — Chrome и Firefox`, () => {
  for (const text of [
    `SyntaxError: missing ) after argument list`,
    `SyntaxError: missing ) after argument list`,
  ]) {
    const result = explain(text);
    assert.deepEqual(terms(result).slice(1), [
      `missing )`,
      `after argument list`,
    ]);
    assert.match(result.sentences.at(-1), /Засечка/);
  }
});

test(`неверный селектор — Chrome и Firefox`, () => {
  const chrome = explain(
    `SyntaxError: Failed to execute 'querySelector' on 'Document': '#' is not a valid selector.`,
  );
  assert.deepEqual(terms(chrome), [
    `SyntaxError`,
    `Failed to execute 'querySelector' on 'Document'`,
    `'#' is not a valid selector`,
  ]);
  assert.match(chrome.parts[0][1], /не код, а селектор/);
  assert.deepEqual(chrome.sentences, [
    `После # нужно имя, например \`#lamp\`.`,
  ]);

  const firefox = explain(
    `SyntaxError: Document.querySelector: '.' is not a valid selector`,
  );
  assert.equal(terms(firefox)[1], `'.' is not a valid selector`);
  assert.deepEqual(firefox.sentences, [
    `После точки нужно имя класса, например \`.door-lamp\`.`,
  ]);
});

const NOTHING = `TypeError: Cannot read properties of null (reading 'classList')`;
const ROOM = {
  ids: [`lamp`, `board`, `plafond`, `frame-picker`],
  classes: [`lamp`, `door`, `door-lamp`, `board`, `plafond`],
  labels: { lamp: `на лампе`, board: `на табло`, plafond: `на плафоне` },
};

for (const [typed, phrase] of [
  [
    `lamp`,
    `Без \`#\` браузер ищет тег \`<lamp>\`, а такого нет. Решётка значит «по id».`,
  ],
  [
    `door-lamp`,
    `Без точки браузер ищет тег \`<door-lamp>\`. Точка значит «по классу».`,
  ],
  [
    `#door-lamp`,
    `У этой вещи нет id. \`door-lamp\` — класс, его ищут через точку.`,
  ],
  [`.frame-picker`, `\`frame-picker\` — это id, его ищут через решётку.`],
  [
    `.door lamp`,
    `Пробел в селекторе — это «внутри». Имя класса пишется целиком: \`door-lamp\`.`,
  ],
  [`#plafon`, `На плафоне выбито \`plafond\`, у тебя \`plafon\`.`],
]) {
  test(`не нашлось по ${typed}: говорит, что не так`, () => {
    const { sentences } = explainError(
      { text: NOTHING, line: 8 },
      { ...ROOM, code: ``, typed: [typed] },
    );
    assert.deepEqual(sentences, [
      `querySelector ничего не нашёл и вернул null.`,
      phrase,
    ]);
  });
}

test(`положить в null — своя часть разбора`, () => {
  const result = explain(
    `TypeError: Cannot set properties of null (setting 'textContent')`,
    { typed: [`#bord`], ...ROOM },
  );
  assert.deepEqual(terms(result), [
    `TypeError`,
    `Cannot set properties of null`,
    `(setting 'textContent')`,
  ]);
  assert.equal(
    result.sentences[1],
    `На табло выбито \`board\`, у тебя \`bord\`.`,
  );
});

test(`место для значения вызвали скобками`, () => {
  const { sentences } = explain(
    `TypeError: document.querySelector(...).textContent is not a function`,
  );
  assert.deepEqual(sentences, [
    `\`textContent\` — не действие, а место для текста. В него кладут через \`=\`.`,
  ]);
});

test(`слово без кавычек — чьё-то имя`, () => {
  const { sentences } = explain(`ReferenceError: on is not defined`);
  assert.match(sentences[0], /Без кавычек `on` — чьё-то имя/);
});

test(`регистр: classlist вместо classList`, () => {
  const { sentences } = explain(
    `TypeError: Cannot read properties of undefined (reading 'add')`,
    { code: `document.querySelector(\`#lamp\`).classlist.add(\`on\`);` },
  );
  assert.deepEqual(sentences, [
    `Слева от .add ничего нет. Регистр важен: \`classList\`, с большой \`L\`.`,
  ]);
});

test(`селектор без кавычек — частное поле`, () => {
  const result = explain(
    `SyntaxError: Private field '#lamp' must be declared in an enclosing class`,
  );
  assert.deepEqual(terms(result), [
    `SyntaxError`,
    `Private field '#lamp'`,
    `must be declared in an enclosing class`,
  ]);
  assert.match(result.sentences[0], /Селектор — это строка/);
});

test(`пробел в классе`, () => {
  const result = explain(
    `InvalidCharacterError: Failed to execute 'add' on 'DOMTokenList': The token provided ('lamp on') contains HTML space characters, which are not valid in tokens.`,
  );
  assert.deepEqual(terms(result), [
    `InvalidCharacterError`,
    `Failed to execute 'add' on 'DOMTokenList'`,
    `The token provided ('lamp on')`,
    `contains HTML space characters`,
  ]);
  assert.match(result.sentences[0], /только `on`/);
});

test(`незакрытая кавычка: и обычная, и из-за русской раскладки`, () => {
  const plain = explain(`SyntaxError: Unexpected end of input`, {
    code: `a.textContent = \`к окну;`,
  });
  assert.match(plain.sentences[0], /открыта кавычкой/);
  const russian = explain(`SyntaxError: Unexpected end of input`, {
    code: `a.textContent = \`к окнуё;`,
  });
  assert.match(russian.sentences[0], /в русской раскладке набралась ё/);
  assert.equal(russian.sentences.length, 2);
});

test(`дефис в свойстве и цвет без кавычек`, () => {
  const hyphen = explain(`SyntaxError: Invalid left-hand side in assignment`, {
    code: `a.style.background-color = \`#fff\`;`,
  });
  assert.match(hyphen.sentences[0], /Дефис в JS — это минус/);
  const color = explain(`SyntaxError: Invalid or unexpected token`, {
    code: `a.style.backgroundColor = #81b5f6;`,
  });
  assert.match(color.sentences[0], /Цвет для CSS — это строка/);
});

test(`заметки не считаются: ё в «Дано» — не раскладка`, () => {
  const { sentences } = explain(`ReferenceError: foo is not defined`, {
    code: `// ещё\nfoo();`,
  });
  assert.equal(sentences.length, 1);
});

test(`№ вместо решётки`, () => {
  const { sentences } = explain(NOTHING, { code: `q(\`№lamp\`);` });
  assert.match(sentences.at(-1), /Shift\+3/);
});

test(`русская раскладка: ё вместо обратной кавычки`, () => {
  const result = explain(`SyntaxError: Invalid or unexpected token`, {
    code: `document.querySelector(ё#lampё)`,
  });
  assert.match(result.sentences.at(-1), /русская раскладка/);
});

test(`незнакомая ошибка — честно: имя и сообщение`, () => {
  const result = explain(`SecurityError: Failed to read a named property`);
  assert.deepEqual(terms(result), [`SecurityError`]);
  assert.deepEqual(result.sentences, []);
});

test(`текст браузера остаётся дословным`, () => {
  const text = `TypeError: Cannot read properties of null (reading 'classList')`;
  assert.equal(explain(text).text, text);
});

for (const [text, code, phrase] of [
  [
    `TypeError: Cannot read properties of undefined (reading 'add')`,
    `document.querySelectorAll(\`.drawer\`).classList.add(\`open\`);`,
    /У списка нет `classList`/,
  ],
  [
    `ReferenceError: drawer is not defined`,
    `q.forEach(() => { drawer.classList.add(\`open\`); });`,
    /Напиши `\(drawer\) =>`/,
  ],
  [
    `ReferenceError: drawer is not defined`,
    `for (drawer of list) {}`,
    /for \(const drawer of/,
  ],
  [
    `SyntaxError: Malformed arrow function parameter list`,
    `q.forEach(drawer) => {`,
    /Скобка закрылась раньше функции/,
  ],
  [
    `SyntaxError: Unexpected identifier 'drawer'`,
    `if drawer.dataset.count !== \`0\` {`,
    /Условие пишут в круглых скобках/,
  ],
  [`SyntaxError: Unexpected token '='`, `a !=== b`, /три знака/],
  [`SyntaxError: Unexpected token '!'`, `a.!contains()`, /ставят в начало/],
  [`SyntaxError: Unexpected token '&&'`, `if (a) && (b) {`, /в одних скобках/],
  [
    `SyntaxError: Unexpected identifier 'and'`,
    `if (a and b) {`,
    /двумя знаками/,
  ],
  [
    `SyntaxError: Unexpected identifier 'drawer'`,
    `if (not drawer.ok) {`,
    /«не» пишут знаком/,
  ],
  [
    `SyntaxError: Unexpected token 'else'`,
    `if (a) {}; else {}`,
    /Точка с запятой/,
  ],
  [`SyntaxError: Unexpected token '{'`, `} elseif (a) {`, /два слова/],
  [`SyntaxError: Unexpected token '{'`, `} else (a) {`, /У `else` нет условия/],
  [`SyntaxError: Illegal return statement`, `return;`, /выход из функции/],
  [
    `SyntaxError: Illegal return statement`,
    `for (const a of b) { return; }`,
    /Из цикла выходят `break`/,
  ],
  [
    `SyntaxError: Illegal break statement`,
    `a.forEach(() => { break; });`,
    /только в цикле/,
  ],
  [
    `ReferenceError: Cannot access 'full' before initialization`,
    `let full = full + 1;`,
    /второе имя `full`/,
  ],
  [
    `ReferenceError: count is not defined`,
    `drawer.dataset.data-count`,
    /Без `data-`/,
  ],
  [
    `TypeError: Cannot read properties of undefined (reading 'count')`,
    `drawer.data.count`,
    /Бирки лежат в `dataset`/,
  ],
  [
    `ReferenceError: full is not defined`,
    `a.forEach(() => { let full = 0; }); b = full;`,
    /снаружи не видно/,
  ],
  [
    `TypeError: Cannot read properties of undefined (reading 'contains')`,
    `for (const d in list) { d.classList.contains(1); }`,
    /перебирает номера/,
  ],
]) {
  test(`глава 3: ${text.slice(0, 50)} — ${code.slice(0, 24)}`, () => {
    const { sentences } = explain(text, { code });
    assert.ok(
      sentences.some((sentence) => phrase.test(sentence)),
      sentences.join(` | `),
    );
  });
}
