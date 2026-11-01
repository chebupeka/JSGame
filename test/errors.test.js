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
    assert.equal(terms(result)[1], `missing ) after argument list`);
    assert.match(result.sentences.at(-1), /Засечка/);
  }
});

test(`неверный селектор — Chrome и Firefox`, () => {
  for (const text of [
    `SyntaxError: Failed to execute 'querySelector' on 'Document': '#' is not a valid selector.`,
    `SyntaxError: Document.querySelector: '#' is not a valid selector`,
  ]) {
    const result = explain(text);
    assert.equal(terms(result)[1], `'#' is not a valid selector`);
    assert.deepEqual(result.sentences, [
      `После # или . нужно имя, например \`#lamp\`.`,
    ]);
  }
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
