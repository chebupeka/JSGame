import assert from "node:assert/strict";
import { test } from "node:test";

import { findQueries } from "../src/code/preview.js";

// Заглушка комнаты: какие селекторы находят вещи станции.
const STATION = new Set([`#lamp`, `.lamp`, `.door`, `.room`]);
const verdict = (code) =>
  findQueries(code).map(({ status, selector, repeat, all }) => {
    if (status === `unknown`) return `узнаем`;
    const found = STATION.has(selector) ? `нашлось` : `не нашлось`;
    return [found, repeat && `каждый раз`, all && `все`]
      .filter(Boolean)
      .join(` `);
  });

const cases = [
  [`без скобки`, "document.querySelector(`#lamp`", [`нашлось`]],
  [
    `целая строка`,
    "document.querySelector(`#lamp`).classList.add(`on`);",
    [`нашлось`],
  ],
  [`недописанное имя`, "document.querySelector(`#lam`", [`не нашлось`]],
  [`незакрытая кавычка`, "document.querySelector(`#lamp", []],
  [
    `незакрытая кавычка глотает код`,
    "document.querySelector(`#lamp\nconst a = `on`;",
    [],
  ],
  [`пустой вызов`, "document.querySelector(", []],
  [`шаблон с подстановкой`, "document.querySelector(`#${id}`)", [`узнаем`]],
  [`селектор из переменной`, "document.querySelector(name)", [`узнаем`]],
  [`поиск не от document`, "el.querySelector(`#lamp`)", [`узнаем`]],
  [
    `поиск от document.body`,
    "document.body.querySelector(`#lamp`)",
    [`узнаем`],
  ],
  [
    `в стрелочной функции`,
    "door.addEventListener(`click`, () => {\n  document.querySelector(`#lamp`);\n});",
    [`нашлось каждый раз`],
  ],
  [
    `в обычной функции`,
    "function light() {\n  document.querySelector(`#lamp`);\n}",
    [`нашлось каждый раз`],
  ],
  [`селектор в комментарии`, "// document.querySelector(`#lamp`)", []],
  [`в блочном комментарии`, "/* document.querySelector(`#lamp`) */", []],
  [
    `класс сменили раньше`,
    "lamp.classList.add(`on`);\ndocument.querySelector(`.on`);",
    [`узнаем`],
  ],
  [
    `id сменили раньше`,
    "lamp.id = `x`;\ndocument.querySelector(`#lamp`);",
    [`узнаем`],
  ],
  [
    `innerHTML раньше`,
    "document.body.innerHTML = ``;\ndocument.querySelector(`#lamp`);",
    [`узнаем`],
  ],
  [
    `смена после поиска не мешает`,
    "document.querySelector(`#lamp`).classList.add(`on`);\nconst x = 1;",
    [`нашлось`],
  ],
  [
    `смена внутри обработчика не раньше`,
    "door.addEventListener(`click`, () => lamp.classList.add(`on`));\ndocument.querySelector(`#lamp`);",
    [`нашлось`],
  ],
  [
    `внутри функции «раньше» — весь файл`,
    "const f = () => document.querySelector(`#lamp`);\nlamp.classList.add(`on`);",
    [`узнаем`],
  ],
  [
    `вызов своей функции раньше`,
    "const paint = () => {};\npaint();\ndocument.querySelector(`#lamp`);",
    [`узнаем`],
  ],
  [
    `чужая функция не считается`,
    "setTimeout(() => {}, 10);\ndocument.querySelector(`#lamp`);",
    [`нашлось`],
  ],
  [`одинарные кавычки тоже`, "document.querySelector('.door')", [`нашлось`]],
  [`querySelectorAll`, "document.querySelectorAll(`.lamp`)", [`нашлось все`]],
  [
    `две строки — два поиска`,
    "const lamp = document.querySelector(`#lamp`);\nconst door = document.querySelector(`.door`);",
    [`нашлось`, `нашлось`],
  ],
  [
    `while (true) не выполняется`,
    "while (true) {}\ndocument.querySelector(`#lamp`);",
    [`нашлось`],
  ],
  [`мусор вместо кода`, "))) document.querySelector(`#lamp`) (((", [`нашлось`]],
];

for (const [name, code, expected] of cases) {
  test(name, () => assert.deepEqual(verdict(code), expected));
}

test(`отметка ложится ровно на текст селектора`, () => {
  const code = "document.querySelector(`#lamp`)";
  const [{ from, to }] = findQueries(code);
  assert.equal(code.slice(from, to), `#lamp`);
});
