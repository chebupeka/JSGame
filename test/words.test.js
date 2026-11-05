import assert from "node:assert/strict";
import { test } from "node:test";

import { SIGNS, WORDS, signAt } from "../src/terminal/words.js";

test(`у каждой справки есть смысл и имя страницы MDN`, () => {
  [...Object.values(WORDS), ...Object.values(SIGNS)].forEach(
    ({ text, mdn }) => {
      assert.ok(text.length > 5, text);
      assert.ok(mdn.length > 1, mdn);
    },
  );
});

test(`знак под мышью`, () => {
  const line = `a.textContent = () => b; // c = d`;
  assert.equal(signAt(line, line.indexOf(`= (`)), `=`);
  assert.equal(signAt(line, line.indexOf(`=>`)), `=>`);
  assert.equal(signAt(line, line.indexOf(`=>`) + 1), `=>`);
  assert.equal(signAt(line, line.indexOf(`//`)), `//`);
  assert.equal(signAt(line, line.indexOf(`//`) + 1), `//`);
  // В заметке знак — это просто текст.
  assert.equal(signAt(line, line.indexOf(`c = d`) + 2), null);
  assert.equal(signAt(line, 0), null);
});

test(`сравнение — не присваивание`, () => {
  const line = `if (a === b && c !== d && e <= f) {}`;
  [`===`, `!==`, `<=`].forEach((sign) => {
    const at = line.indexOf(sign);
    [...sign].forEach((_, i) => assert.equal(signAt(line, at + i), null));
  });
});
