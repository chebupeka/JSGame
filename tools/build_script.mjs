// Сценарий задач живёт в docs/acts/*.md, и переписывать его руками в код
// значило бы получить две правды. Этот скрипт достаёт из него то, что видит
// игрок: текст файла при входе, пометки, подсказки и эталонное решение —
// и кладёт в src/tasks/script/*.json. Поведение задач (её проверки) написано
// кодом отдельно. Что JSON совпадает со сценарием, следит test/script.test.js.
//
//   node tools/build_script.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Разметка внутри фразы — только для документа: на полях кода нет markdown.
// ``a`b`` и `a` становятся a, **a** — a.
export const plainText = (text) =>
  text
    .replace(/``\s?([^]*?)\s?``|`([^`]+)`/g, (_, long, short) => long ?? short)
    .replace(/\*\*([^*]+)\*\*/g, (_, bold) => bold)
    .trim();

// Блок кода: строки как есть, в конце файла один перевод строки.
const FENCE = /```\w*\n([^]*?)\n?```/;

const fileText = (lines) => (lines.endsWith(`\n`) ? lines : `${lines}\n`);

const codeOf = (block) => {
  const match = block?.match(FENCE);
  return match ? fileText(match[1]) : null;
};

// Нумерованный список внутри поля: «  1. фраза», продолжение — с отступом.
// Блок кода внутри пункта сохраняет переводы строк и отступы.
const listOf = (block) => {
  if (!block) return [];
  const items = [];
  block.split(`\n`).forEach((line) => {
    const start = line.match(/^\s*\d+\.\s+(.*)$/);
    if (start) items.push(start[1]);
    else if (items.length && line.trim()) {
      items[items.length - 1] += `\n${line.replace(/^\s{0,5}/, ``)}`;
    }
  });
  return items.map((item) => {
    const fence = item.match(FENCE);
    if (fence) return fence[1];
    return plainText(item.replace(/\n/g, ` `));
  });
};

// Поля задачи: «- **Имя:** …» с нулевым отступом, до следующего такого поля.
const fieldsOf = (body) => {
  const fields = {};
  let current = null;
  body.split(`\n`).forEach((line) => {
    const start = line.match(/^- \*\*([^*]+?)[.:]?\*\*(.*)$/);
    if (start) {
      current = start[1];
      fields[current] = start[2];
    } else if (current) {
      fields[current] += `\n${line}`;
    }
  });
  return fields;
};

const pick = (fields, prefix) =>
  fields[Object.keys(fields).find((name) => name.startsWith(prefix))];

const HEADING = /^### (\d+)\.(\d+[a-zа-я]?) (.+?) \(`([^`]+)`\).*$/gm;

export const parseAct = (markdown) => {
  const headings = [...markdown.matchAll(HEADING)];
  return headings.map((heading, index) => {
    const [, chapter, number, title, id] = heading;
    const end = headings[index + 1]?.index ?? markdown.length;
    // Заголовок главы или проверка новичком — уже не про эту задачу.
    const tail = markdown.slice(heading.index, end);
    const stop = tail.search(/^## /m);
    const fields = fieldsOf(stop === -1 ? tail : tail.slice(0, stop));
    const file = pick(fields, `Файл`)?.match(/`([^`]+)`/)?.[1] ?? null;

    return {
      id,
      chapter: Number(chapter),
      number: `${chapter}.${number}`,
      title,
      file,
      code: codeOf(pick(fields, `Текст файла при входе`)),
      notes: listOf(pick(fields, `Пометка при входе`)),
      hints: listOf(pick(fields, `Подсказки по щелчку`)),
      solution: codeOf(pick(fields, `Эталонное решение`)),
    };
  });
};

export const ACTS = [`act-1-morning`];

export const scriptOf = (name) =>
  `${JSON.stringify(parseAct(readFileSync(new URL(`../docs/acts/${name}.md`, import.meta.url), `utf8`)), null, 2)}\n`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ACTS.forEach((name) => {
    const target = new URL(`../src/tasks/script/${name}.json`, import.meta.url);
    writeFileSync(target, scriptOf(name));
    const tasks = JSON.parse(scriptOf(name));
    console.log(`${name}: ${tasks.length} задач`);
    tasks
      .filter(
        ({ file, code, solution, hints }) =>
          !file || !code || !solution || hints.length < 3,
      )
      .forEach(({ number, id }) =>
        console.log(`  неполная: ${number} ${id}`),
      );
  });
}
