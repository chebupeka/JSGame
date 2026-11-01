// Разбор ошибки браузера для новичка. Сам текст ошибки показываем дословно,
// по-английски (решение 3), а под ним — разбор по частям и одна фраза
// по-русски. Тексты у браузеров разные, поэтому разбор идёт по шаблонам
// и Chrome, и Firefox; незнакомую ошибку разбираем честно: имя и сообщение.

const KINDS = {
  TypeError: `со значением сделали то, чего с ним делать нельзя`,
  ReferenceError: `обратились к имени, которого нет`,
  SyntaxError: `код не получилось прочитать: где-то нарушено правописание языка`,
  RangeError: `значение вышло за допустимые границы`,
  SecurityError: `браузер не пустил туда, куда этому коду нельзя`,
};

// Имена, которые новичок встречает раньше всего: на них ищем «похоже на».
const KNOWN = [
  `document`,
  `querySelector`,
  `querySelectorAll`,
  `classList`,
  `add`,
  `remove`,
  `toggle`,
  `contains`,
  `style`,
  `textContent`,
  `addEventListener`,
  `console`,
  `log`,
];

// Сколько правок (вставить, удалить, заменить букву) отделяют a от b.
export const distance = (a, b) => {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[b.length];
};

// Самое похожее имя, если оно отличается не больше чем на две буквы.
export const closest = (word, names) =>
  names
    .filter((name) => name !== word)
    .map((name) => ({ name, d: distance(word, name) }))
    .filter(({ d }) => d <= 2)
    .sort((a, b) => a.d - b.d)[0]?.name ?? null;

const split = (text) => {
  const match = text.match(/^(\w+):\s*([\s\S]*)$/);
  return match
    ? { name: match[1], message: match[2] }
    : { name: ``, message: text };
};

// Шаблоны сообщений: что значит каждая часть и что случилось.
const RULES = [
  {
    // Chrome: Cannot read properties of null (reading 'classList')
    test: /Cannot read properties of (null|undefined) \(reading '([^']+)'\)/,
    read: ([whole, value, property]) => ({
      value,
      property,
      parts: [
        [
          whole.replace(/ \(reading.*/, ``),
          value === `null`
            ? `пытались взять что-то у null, то есть у «ничего»`
            : `пытались взять что-то у undefined: значения нет`,
        ],
        [`(reading '${property}')`, `а именно ${property}`],
      ],
    }),
  },
  {
    // Firefox: can't access property "classList", document.querySelector(...) is null
    test: /can't access property "([^"]+)", .+ is (null|undefined)/,
    read: ([, property, value]) => ({
      value,
      property,
      parts: [
        [
          `can't access property "${property}"`,
          `не получилось взять ${property}`,
        ],
        [
          `is ${value}`,
          value === `null`
            ? `потому что слева null, то есть «ничего»`
            : `потому что слева undefined: значения нет`,
        ],
      ],
    }),
  },
  {
    // Старый Firefox: document.querySelector(...) is null
    test: /^(.+) is (null|undefined)$/,
    read: ([, what, value]) => ({
      value,
      parts: [[`${what} is ${value}`, `здесь получилось ${value}: ничего`]],
    }),
  },
  {
    test: /(?:^|\s)(\S+) is not a function/,
    read: ([, call]) => {
      const name = call.split(`.`).at(-1);
      return {
        method: name,
        parts: [
          [`${call} is not a function`, `то, что вызвали скобками, не функция`],
        ],
      };
    },
  },
  {
    test: /^(\S+) is not defined/,
    read: ([, name]) => ({
      undefinedName: name,
      parts: [[`${name} is not defined`, `имя ${name} нигде не объявлено`]],
    }),
  },
  {
    // Chrome: Failed to execute 'querySelector' on 'Document': '#' is not a valid selector.
    // Firefox: Document.querySelector: '#' is not a valid selector
    test: /'([^']*)' is not a valid selector/,
    read: ([, selector]) => ({
      badSelector: selector,
      parts: [
        [`'${selector}' is not a valid selector`, `в строке селектора ошибка`],
      ],
    }),
  },
  {
    test: /missing \) after argument list/,
    read: () => ({
      parts: [
        [
          `missing ) after argument list`,
          `после аргументов не хватает закрывающей скобки )`,
        ],
      ],
    }),
  },
  {
    test: /Unexpected end of input/,
    read: () => ({
      parts: [
        [
          `Unexpected end of input`,
          `код оборвался: что-то открыто и не закрыто`,
        ],
      ],
    }),
  },
  {
    test: /Unexpected token\s*'?([^']*)'?/,
    read: ([, token]) => ({
      parts: [
        [
          `Unexpected token ${token}`.trim(),
          `в этом месте такого знака быть не может`,
        ],
      ],
    }),
  },
  {
    test: /Invalid or unexpected token/,
    read: () => ({
      parts: [
        [
          `Invalid or unexpected token`,
          `попался знак, которого в коде быть не может`,
        ],
      ],
    }),
  },
];

// Включена русская раскладка: вместо ` набирается ё, вместо # — №.
const russianLayout = (code) => /[ёЁ№]/.test(code.replace(/\/\/.*$/gm, ``));

// Имена вещей станции, которые нашёл бы селектор: #id и .класс.
const selectorName = (selector) => {
  const match = selector.match(/^([#.])([\w-]+)$/);
  return match ? { mark: match[1], name: match[2] } : null;
};

// error — { text, line, column } из песочницы; context —
// { code, ids, classes, labels: { lamp: `на лампе` }, typed: [селекторы] }.
export const explainError = (error, context) => {
  const { name, message } = split(error.text);
  const rule = RULES.find(({ test }) => test.test(message));
  const facts = rule ? rule.read(message.match(rule.test)) : { parts: [] };

  const parts = [
    ...(KINDS[name]
      ? [[name, KINDS[name]]]
      : name
        ? [[name, `так браузер называет этот вид ошибки`]]
        : []),
    ...facts.parts,
  ];

  const sentences = [];

  if (facts.value === `null` && facts.property) {
    sentences.push(`querySelector ничего не нашёл и вернул null.`);
    for (const selector of context.typed ?? []) {
      const typed = selectorName(selector);
      if (!typed) continue;

      const pool = typed.mark === `#` ? context.ids : context.classes;
      if (pool.includes(typed.name)) continue;

      const near = closest(typed.name, pool);
      if (!near) continue;

      const where = context.labels?.[near];
      sentences.push(
        where
          ? `${where[0].toUpperCase()}${where.slice(1)} выбито \`${near}\`, у тебя \`${typed.name}\`.`
          : `В комнате есть \`${typed.mark}${near}\`, у тебя \`${selector}\`.`,
      );
      break;
    }
  } else if (facts.value === `undefined` && facts.property) {
    sentences.push(
      `Слева от .${facts.property} ничего нет. Проверь, как написано имя перед ним.`,
    );
  }

  if (facts.method) {
    const near = closest(facts.method, KNOWN);
    sentences.push(
      near
        ? `Метода \`${facts.method}\` нет. Похоже на \`${near}\`.`
        : `Метода \`${facts.method}\` нет.`,
    );
  }

  if (facts.undefinedName) {
    const near = closest(facts.undefinedName, KNOWN);
    sentences.push(
      near
        ? `Похоже на \`${near}\`.`
        : `Объяви его или проверь, как оно написано.`,
    );
  }

  if (facts.badSelector !== undefined) {
    sentences.push(`После # или . нужно имя, например \`#lamp\`.`);
  }

  if (name === `SyntaxError` && facts.badSelector === undefined) {
    sentences.push(
      `Код не выполнился ни одной строкой. Засечка — там, где чтение споткнулось.`,
    );
  }

  if (russianLayout(context.code ?? ``)) {
    sentences.push(
      `Похоже, включена русская раскладка: вместо \` набралась ё, вместо # — №. Переключи на английскую.`,
    );
  }

  return {
    text: error.text,
    line: error.line,
    column: error.column,
    parts,
    sentences,
  };
};
