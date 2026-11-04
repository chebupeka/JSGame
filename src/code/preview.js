import { parse } from "acorn-loose";
import { ancestor } from "acorn-walk";

// Предпросмотр, пока игрок печатает. Код НЕ выполняется: мы только читаем
// разбор терпимым к ошибкам парсером и находим поиски вещей
// `document.querySelector(…)`. Светится только то, что известно точно.
// Остальное честно: «узнаем при запуске».

const QUERIES = new Set([`querySelector`, `querySelectorAll`]);
const FUNCTIONS = new Set([
  `FunctionDeclaration`,
  `FunctionExpression`,
  `ArrowFunctionExpression`,
]);

// Всё, что может поменять разметку, классы или id. Если такое выполнится
// раньше поиска, ответ «нашлось» или «не нашлось» был бы догадкой.
const CHANGERS = new Set([
  `classList`,
  `id`,
  `className`,
  `dataset`,
  `setAttribute`,
  `removeAttribute`,
  `toggleAttribute`,
  `innerHTML`,
  `outerHTML`,
  `textContent`,
  `innerText`,
  `append`,
  `appendChild`,
  `prepend`,
  `remove`,
  `removeChild`,
  `replaceWith`,
  `replaceChildren`,
  `insertAdjacentHTML`,
  `insertAdjacentElement`,
  `insertBefore`,
  `before`,
  `after`,
  `createElement`,
  `write`,
  `writeln`,
]);

const insideFunction = (ancestors) =>
  ancestors.some((node) => FUNCTIONS.has(node.type));

const propertyName = ({ property, computed }) =>
  !computed && property.type === `Identifier` ? property.name : null;

// Имена функций, которые игрок объявил сам: их вызов может сделать что угодно.
const ownFunctions = (ast) => {
  const names = new Set();
  ancestor(ast, {
    FunctionDeclaration: (node) => node.id && names.add(node.id.name),
    VariableDeclarator: (node) => {
      if (node.id.type === `Identifier` && FUNCTIONS.has(node.init?.type)) {
        names.add(node.id.name);
      }
    },
  });
  return names;
};

// Места, где разметка может поменяться: { at, top } — позиция в тексте
// и выполняется ли это сразу при запуске (не внутри функции).
const changes = (ast, own) => {
  const found = [];
  ancestor(ast, {
    MemberExpression: (node, _, ancestors) => {
      if (CHANGERS.has(propertyName(node))) {
        found.push({
          at: node.property.start,
          top: !insideFunction(ancestors),
        });
      }
    },
    CallExpression: (node, _, ancestors) => {
      if (node.callee.type === `Identifier` && own.has(node.callee.name)) {
        found.push({ at: node.start, top: !insideFunction(ancestors) });
      }
    },
  });
  return found;
};

// Строка селектора в кавычках, если она правда закрыта в тексте, а не
// дорисована парсером. Перенос внутри — признак незакрытой строки,
// которая проглотила код до следующей кавычки.
const literal = (node, code) => {
  const quote = code[node.start];
  const closed = node.end - node.start >= 2 && code[node.end - 1] === quote;
  if (!closed) return null;

  const isTemplate = node.type === `TemplateLiteral`;
  const isString = node.type === `Literal` && typeof node.value === `string`;
  if (isTemplate && node.expressions.length > 0) return { dynamic: true };
  if (!isTemplate && !isString) return null;

  const text = isTemplate ? node.quasis[0].value.cooked : node.value;
  if (text === null || text.includes(`\n`)) return null;

  return { text };
};

// Все поиски в коде. Каждый — { status, selector, all, repeat, from, to }:
//   status `check`   — спросить у настоящей комнаты, нашлось ли;
//   status `unknown` — узнаем при запуске;
//   repeat           — поиск внутри функции: будет искать каждый раз.
export const findQueries = (code) => {
  let ast;
  try {
    ast = parse(code, { ecmaVersion: `latest`, sourceType: `module` });
  } catch {
    return [];
  }

  const own = ownFunctions(ast);
  const changed = changes(ast, own);
  const queries = [];

  ancestor(ast, {
    CallExpression: (node, _, ancestors) => {
      const { callee } = node;
      if (callee.type !== `MemberExpression`) return;

      const method = propertyName(callee);
      if (!QUERIES.has(method)) return;

      const [argument] = node.arguments;
      if (!argument) return;

      const repeat = insideFunction(ancestors.slice(0, -1));
      const base = {
        all: method === `querySelectorAll`,
        repeat,
        from: argument.start,
        to: argument.end,
        // Весь вызов: на него может вешаться датчик (findListeners).
        call: { from: node.start, to: node.end },
      };

      const value = [`TemplateLiteral`, `Literal`].includes(argument.type)
        ? literal(argument, code)
        : { dynamic: true };
      if (!value) return;

      const fromDocument =
        callee.object.type === `Identifier` &&
        callee.object.name === `document`;
      const changedBefore = changed.some(({ at, top }) =>
        repeat ? true : top && at < node.start,
      );

      if (value.dynamic || !fromDocument || changedBefore) {
        queries.push({
          ...base,
          status: `unknown`,
          selector: value.text ?? null,
        });
        return;
      }

      queries.push({
        ...base,
        status: `check`,
        selector: value.text,
        from: argument.start + 1,
        to: argument.end - 1,
      });
    },
  });

  return queries.sort((a, b) => a.from - b.from);
};

// Датчики в коде: `….addEventListener(`тип`, …)` с закрытым именем
// события. on — где в тексте то, на что датчик вешают: если это поиск
// из findQueries, датчик встанет на найденную им вещь. Код не выполняется.
export const findListeners = (code) => {
  let ast;
  try {
    ast = parse(code, { ecmaVersion: `latest`, sourceType: `module` });
  } catch {
    return [];
  }

  const found = [];
  ancestor(ast, {
    CallExpression: (node, _, ancestors) => {
      const { callee } = node;
      if (callee.type !== `MemberExpression`) return;
      if (propertyName(callee) !== `addEventListener`) return;

      const [argument] = node.arguments;
      if (![`TemplateLiteral`, `Literal`].includes(argument?.type)) return;
      const value = literal(argument, code);
      if (!value || value.dynamic) return;

      found.push({
        type: value.text,
        repeat: insideFunction(ancestors.slice(0, -1)),
        from: argument.start + 1,
        to: argument.end - 1,
        on: { from: callee.object.start, to: callee.object.end },
      });
    },
  });
  return found.sort((a, b) => a.from - b.from);
};
