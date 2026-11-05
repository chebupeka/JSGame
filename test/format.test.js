import assert from "node:assert/strict";
import { test } from "node:test";

import prettier from "prettier";

import { PLAYER_OPTIONS, formatCode } from "../src/terminal/format.js";

// Шаг 10 из MECHANICS.md §4: 155 символов в одну строку.
const ONE_LINE =
  "document.querySelector(`#frame-picker`).addEventListener(`input`, (evt) => { document.querySelector(`.frame`).style.backgroundColor = evt.target.value; });\n";

// Шаг 9: код профи.
const PRO = [
  "// Хочу, чтобы окно светило тем цветом, что на ручке.",
  "const frame = document.querySelector(`.frame`);",
  "",
  "document",
  "  .querySelector(`#frame-picker`)",
  "  .addEventListener(`input`, ({ target }) => {",
  "    frame.style.backgroundColor = target.value;",
  "  });",
  "",
].join(`\n`);

test(`однострочник — ровно то же, что Prettier в Node с шириной 60`, async () => {
  const { code, changed } = await formatCode(ONE_LINE);
  assert.equal(code, await prettier.format(ONE_LINE, PLAYER_OPTIONS));
  assert.equal(changed, true);
  assert.ok(code.split(`\n`).every((line) => line.length <= 60));
  assert.ok(code.startsWith(`document\n  .querySelector(\`#frame-picker\`)\n`));
});

test(`код профи Prettier не меняет`, async () => {
  const { code, changed, broken } = await formatCode(PRO);
  assert.equal(code, PRO);
  assert.equal(changed, false);
  assert.equal(broken, undefined);
});

test(`обратные кавычки остаются обратными`, async () => {
  const { code } = await formatCode("const a = `#lamp`;\n");
  assert.equal(code, "const a = `#lamp`;\n");
});

test(`курсор не прыгает: остаётся на том же слове`, async () => {
  const source = "const   lamp=1;\nconst other = 2;\n";
  const at = source.indexOf(`other`);
  const { code, cursorOffset } = await formatCode(source, at);
  assert.equal(code.slice(cursorOffset, cursorOffset + 5), `other`);
});

test(`код с ошибкой не трогаем`, async () => {
  const broken = "document.querySelector(`#lamp`.classList;\n";
  const result = await formatCode(broken, 3);
  assert.deepEqual(result, {
    code: broken,
    cursorOffset: 3,
    changed: false,
    broken: true,
  });
});
