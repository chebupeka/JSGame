import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { format } from "prettier";

import { PLAYER_OPTIONS } from "../src/terminal/format.js";
import { entryCode } from "../src/tasks/chain.js";
import { ACTS, parseAct, plainText, scriptOf } from "../tools/build_script.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), `utf8`);
const NOT_IN_FILE = new Set([`corridor-console`, `corridor-dom`]);

test(`разметка сценария снимается, код внутри остаётся`, () => {
  assert.equal(
    plainText(
      "Найти: `` document.querySelector(`#id`) ``. Решётка `#`, **важно**.",
    ),
    "Найти: document.querySelector(`#id`). Решётка #, важно.",
  );
  assert.equal(
    plainText("Кавычка `` ` `` — клавиша Ё."),
    "Кавычка ` — клавиша Ё.",
  );
});

test(`задача разбирается по полям`, () => {
  const [task] = parseAct(
    [
      "### 1.1 Лампа (`lamp`)",
      "",
      "- **Новое:** что-то",
      "- **Файл:** `lamp.js` (ещё слова)",
      "- **Текст файла при входе:**",
      "",
      "```js",
      "// Дано.",
      "",
      "```",
      "",
      "- **Пометка при входе (поля):**",
      "  1. Первая `a`.",
      "  2. Вторая",
      "     с продолжением.",
      "- **Подсказки по щелчку:**",
      "  1. Раз.",
      "  2. Два.",
      "  3. `` a(`b`) ``",
      "- **Эталонное решение:**",
      "",
      "```js",
      "a(`b`);",
      "```",
      "",
      "## Глава 2",
      "- **Файл:** `чужой.js`",
    ].join(`\n`),
  );
  assert.deepEqual(task, {
    id: `lamp`,
    chapter: 1,
    number: `1.1`,
    title: `Лампа`,
    file: `lamp.js`,
    code: `// Дано.\n`,
    notes: [`Первая a.`, `Вторая с продолжением.`],
    hints: [`Раз.`, `Два.`, "a(`b`)"],
    solution: "a(`b`);\n",
  });
});

for (const name of ACTS) {
  const script = JSON.parse(read(`../src/tasks/script/${name}.json`));

  test(`${name}: JSON совпадает со сценарием (node tools/build_script.mjs)`, () => {
    assert.equal(read(`../src/tasks/script/${name}.json`), scriptOf(name));
  });

  test(`${name}: у каждой задачи всё на месте, id не повторяются`, () => {
    script.forEach(({ number, file, code, solution, hints, notes }) => {
      assert.ok(file, `${number}: файл`);
      assert.ok(code, `${number}: текст при входе`);
      assert.ok(solution, `${number}: эталон`);
      assert.ok(hints.length >= 3, `${number}: подсказки`);
      assert.ok(notes.length >= 1, `${number}: пометка`);
    });
    const ids = script.map(({ id }) => id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test(`${name}: файл продолжается — при входе твой код под новым «Дано»`, () => {
    const files = {};
    script.forEach((task) => {
      if (files[task.file]) {
        assert.equal(entryCode(task, files), task.code, task.number);
      }
      // Эти задачи решают в F12, а файл не меняется.
      if (!NOT_IN_FILE.has(task.id)) files[task.file] = task.solution;
    });
  });

  test(`${name}: эталоны — как их раскладывает Prettier на ширине 60`, async () => {
    for (const { number, solution } of script) {
      assert.equal(
        await format(solution, { ...PLAYER_OPTIONS, parser: `babel` }),
        solution,
        number,
      );
    }
  });
}
