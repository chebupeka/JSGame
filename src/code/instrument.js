import { parse } from "acorn";
import { full, fullAncestor } from "acorn-walk";

// Разметка кода для показа по шагам. Перед каждой инструкцией в той же
// строке встаёт метка `__s(n);`: агент записывает, что инструкция n
// выполнилась. В тело каждого цикла первой встаёт `__g();` — сторож:
// цикл без передышки дольше секунды прерывается. Переносов не добавляем,
// поэтому номера строк остаются твоими. Столбцы правее вставки
// сдвигаются — map() возвращает их назад. Текст ошибок V8 от меток
// не меняется: метка — отдельная инструкция.

const BODIES = new Set([`Program`, `BlockStatement`, `StaticBlock`]);
const FUNCTIONS = new Set([
  `FunctionDeclaration`,
  `FunctionExpression`,
  `ArrowFunctionExpression`,
]);

const LOOPS = new Set([
  `WhileStatement`,
  `DoWhileStatement`,
  `ForStatement`,
  `ForInStatement`,
  `ForOfStatement`,
]);

// Сторож в каждом цикле. Тело без скобок берём в скобки: `for (;;) x++;`
// становится `for (;;) {__g();x++;}` — смысл кода от этого не меняется.
const guardsOf = (ast) => {
  const inserts = [];
  full(ast, (node) => {
    if (!LOOPS.has(node.type)) return;
    const { body } = node;
    if (body.type === `BlockStatement`) {
      inserts.push({ at: body.start + 1, text: `__g();` });
    } else {
      inserts.push({ at: body.start, text: `{__g();` });
      inserts.push({ at: body.end, text: `}` });
    }
  });
  return inserts;
};

const range = (from, to) =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

// Строки инструкции. Тела вложенных функций сейчас не выполняются, а ждут
// вызова: их строки идут в waits («жду»), а не в lines.
const linesOf = (statement) => {
  const lines = new Set(
    range(statement.loc.start.line, statement.loc.end.line),
  );
  const waits = new Set();

  full(statement, (node) => {
    if (!FUNCTIONS.has(node.type) || node === statement) return;
    const body = node.body;
    if (body.type !== `BlockStatement`) return;
    range(body.loc.start.line + 1, body.loc.end.line - 1).forEach((line) => {
      lines.delete(line);
      waits.add(line);
    });
  });

  return { lines: [...lines], waits: [...waits] };
};

// Все вызовы в коде. kept — результат сохранён: вызов стоит в const/let
// или справа от `=`. Тогда переменная держит вещь, и провод висит.
const callsOf = (ast) => {
  const calls = [];
  fullAncestor(ast, (node, _, ancestors) => {
    if (node.type !== `CallExpression`) return;
    const parent = ancestors.at(-2);
    calls.push({
      start: node.start,
      end: node.end,
      lines: range(node.loc.start.line, node.loc.end.line),
      kept:
        (parent.type === `VariableDeclarator` && parent.init === node) ||
        (parent.type === `AssignmentExpression` && parent.right === node),
    });
  });
  return calls;
};

// Где можно поставить метку: только в списке инструкций. Перед телом
// `if (x) y;` без скобок метка поменяла бы смысл кода.
const statementLists = (ast) => {
  const lists = [];
  full(ast, (node) => {
    if (BODIES.has(node.type)) lists.push(node.body);
    if (node.type === `SwitchCase`) lists.push(node.consequent);
  });
  return lists;
};

const markable = (statement) =>
  statement.type !== `FunctionDeclaration` &&
  !(statement.type === `ExpressionStatement` && statement.directive);

export const instrument = (code) => {
  let ast;
  try {
    ast = parse(code, {
      ecmaVersion: `latest`,
      sourceType: `module`,
      locations: true,
    });
  } catch {
    // Строгий разбор не прошёл — код пойдёт как есть, а браузер сам
    // скажет дословно, что не так.
    return {
      code,
      statements: [],
      map: (line, column) => column,
      callAt: () => null,
    };
  }

  const statements = statementLists(ast)
    .flat()
    .filter(markable)
    .sort((a, b) => a.start - b.start)
    .map((statement, n) => ({
      n,
      at: statement.start,
      line: statement.loc.start.line,
      column: statement.loc.start.column + 1,
      ...linesOf(statement),
    }));

  // Начало каждой строки в твоём коде: место вставки → строка и столбец.
  const starts = [0];
  for (const line of code.split(`\n`)) {
    starts.push(starts.at(-1) + line.length + 1);
  }
  const lineOf = (at) => starts.findLastIndex((start) => start <= at) + 1;

  const inserts = [
    ...statements.map(({ n, at }) => ({ at, text: `__s(${n});` })),
    ...guardsOf(ast),
  ].sort((a, b) => a.at - b.at);

  let out = ``;
  let cursor = 0;
  const shifts = {};
  for (const { at, text } of inserts) {
    out += code.slice(cursor, at) + text;
    cursor = at;
    const line = lineOf(at);
    (shifts[line] ??= []).push({
      column: at - starts[line - 1] + 1,
      length: text.length,
    });
  }
  out += code.slice(cursor);

  // Столбец в размеченном коде → столбец в твоём (оба с единицы). Вставки
  // строки идут слева направо; каждая, что стоит левее, сдвигает на свою длину.
  const map = (line, column) => {
    let shifted = 0;
    for (const { column: at, length } of shifts[line] ?? []) {
      if (column < at + shifted + length) break;
      shifted += length;
    }
    return column - shifted;
  };

  // Место вызова из стека → сам вызов, самый внутренний на этом месте.
  // V8 пишет место вызова метода по его имени, а оно внутри вызова.
  const calls = callsOf(ast);
  const callAt = (line, column) => {
    const at = starts[line - 1] + map(line, column) - 1;
    const around = calls.filter(({ start, end }) => start <= at && at < end);
    const inner = around.sort((a, b) => a.end - a.start - (b.end - b.start))[0];
    return inner ? { lines: inner.lines, kept: inner.kept } : null;
  };

  return {
    code: out,
    statements: statements.map(({ n, line, lines, waits }) => ({
      n,
      line,
      lines,
      waits,
    })),
    map,
    callAt,
  };
};

// Решённые файлы станции идут без меток показа, но со сторожем циклов:
// иначе бесконечный цикл в решённом файле вешал бы каждую следующую
// комнату. Не разобралось — как есть: такой файл и так не выполнится.
export const guardLoops = (code) => {
  let ast;
  try {
    ast = parse(code, { ecmaVersion: `latest`, sourceType: `module` });
  } catch {
    return code;
  }

  let out = ``;
  let cursor = 0;
  guardsOf(ast)
    .sort((a, b) => a.at - b.at)
    .forEach(({ at, text }) => {
      out += code.slice(cursor, at) + text;
      cursor = at;
    });
  return out + code.slice(cursor);
};
