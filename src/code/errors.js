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
  InvalidCharacterError: `в значении есть знак, которого там быть не может`,
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

// Это не действия, а места для значения: скобки им не нужны.
const NOT_ACTIONS = {
  textContent: `не действие, а место для текста. В него кладут через \`=\`.`,
  backgroundColor: `не действие, а место для значения. Положи в него через \`=\`.`,
  value: `не действие, а значение. Скобки не нужны.`,
};

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

// Самое похожее имя: отличается не больше чем на две буквы и не больше чем
// на половину слова (`on` — не опечатка в `log`).
export const closest = (word, names) =>
  names
    .filter((name) => name !== word)
    .map((name) => ({ name, d: distance(word, name) }))
    .filter(({ d }) => d <= 2 && d * 2 <= word.length)
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
    // Chrome: Cannot set properties of null (setting 'textContent')
    test: /Cannot set properties of (null|undefined) \(setting '([^']+)'\)/,
    read: ([whole, value, property]) => ({
      value,
      property,
      parts: [
        [
          whole.replace(/ \(setting.*/, ``),
          value === `null`
            ? `пытались положить что-то в null, в «ничего»`
            : `пытались положить что-то в undefined: значения нет`,
        ],
        [`(setting '${property}')`, `а именно в ${property}`],
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
    test: /(?:Failed to execute '(\w+)' on '\w+': )?'([^']*)' is not a valid selector/,
    read: ([whole, method, selector]) => ({
      badSelector: selector,
      parts: [
        ...(method
          ? [
              [
                whole.slice(0, whole.indexOf(`: `)),
                `${method} не смог выполниться`,
              ],
            ]
          : []),
        [
          `'${selector}' is not a valid selector`,
          `${selector} не годится как селектор`,
        ],
      ],
    }),
  },
  {
    // Chrome: The token provided ('lamp on') contains HTML space characters…
    test: /Failed to execute '(\w+)' on 'DOMTokenList': The token provided \('([^']*)'\) contains HTML space characters/,
    read: ([, method, token]) => ({
      spacedToken: token,
      parts: [
        [
          `Failed to execute '${method}' on 'DOMTokenList'`,
          `${method} не смог выполниться. DOMTokenList — настоящее имя списка классов`,
        ],
        [`The token provided ('${token}')`, `вот что ты передал`],
        [`contains HTML space characters`, `внутри пробел`],
      ],
    }),
  },
  {
    test: /Failed to execute '(\w+)' on 'DOMTokenList': The token provided must not be empty/,
    read: ([, method]) => ({
      emptyToken: true,
      parts: [
        [
          `Failed to execute '${method}' on 'DOMTokenList'`,
          `${method} не смог выполниться. DOMTokenList — настоящее имя списка классов`,
        ],
        [`must not be empty`, `имя класса не может быть пустым`],
      ],
    }),
  },
  {
    test: /Private field '(#[^']+)' must be declared in an enclosing class/,
    read: ([, field]) => ({
      privateField: field,
      parts: [
        [
          `Private field '${field}'`,
          `без кавычек ${field} выглядит как особое имя внутри класса`,
        ],
        [`must be declared in an enclosing class`, `а класса вокруг нет`],
      ],
    }),
  },
  {
    test: /missing \) after argument list/,
    read: () => ({
      bracket: true,
      parts: [
        [`missing )`, `не хватает закрывающей скобки`],
        [`after argument list`, `после того, что передали в скобки`],
      ],
    }),
  },
  {
    test: /Invalid left-hand side in assignment/,
    read: () => ({
      leftSide: true,
      parts: [
        [
          `Invalid left-hand side`,
          `слева от = стоит то, во что нельзя положить`,
        ],
        [`in assignment`, `в присваивании`],
      ],
    }),
  },
  {
    test: /Unexpected identifier '([^']+)'/,
    read: ([, word]) => ({
      strayWord: word,
      parts: [
        [`Unexpected identifier`, `в этом месте такого слова быть не может`],
        [`'${word}'`, `вот этого`],
      ],
    }),
  },
  {
    test: /Unexpected end of input/,
    read: () => ({
      unfinished: true,
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
      strayMark: true,
      parts: [
        [
          `Invalid or unexpected token`,
          `попался знак, которого в коде быть не может`,
        ],
      ],
    }),
  },
];

// Код без заметок: о раскладке и кавычках судим только по нему.
const withoutComments = (code = ``) => code.replace(/\/\/.*$/gm, ``);

// Включена русская раскладка: вместо ` набирается ё, вместо # — №.
const layoutAdvice = (code) => {
  const advice = [];
  if (code.includes(`ё`) || code.includes(`Ё`)) {
    advice.push(
      `Похоже, включена русская раскладка: вместо \` набралась ё. Обратная кавычка — та же клавиша в английской раскладке.`,
    );
  }
  if (code.includes(`№`)) {
    advice.push(
      `Вместо # набрался №. Решётка — Shift+3 в английской раскладке.`,
    );
  }
  return advice;
};

// Что не так с селектором, который ничего не нашёл. selector — как набран.
const selectorAdvice = (selector, { ids, classes, labels }) => {
  const words = selector.trim().split(/\s+/);
  if (words.length > 1) {
    const whole = words.join(`-`).replace(/^[#.]/, ``);
    return classes.includes(whole) || ids.includes(whole)
      ? `Пробел в селекторе — это «внутри». Имя класса пишется целиком: \`${whole}\`.`
      : null;
  }

  const match = selector.match(/^([#.]?)([\w-]+)$/);
  if (!match) return null;
  const [, mark, name] = match;

  if (!mark) {
    if (ids.includes(name)) {
      return `Без \`#\` браузер ищет тег \`<${name}>\`, а такого нет. Решётка значит «по id».`;
    }
    return classes.includes(name)
      ? `Без точки браузер ищет тег \`<${name}>\`. Точка значит «по классу».`
      : null;
  }

  const pool = mark === `#` ? ids : classes;
  if (pool.includes(name)) return null;
  if (mark === `#` && classes.includes(name)) {
    return `У этой вещи нет id. \`${name}\` — класс, его ищут через точку.`;
  }
  if (mark === `.` && ids.includes(name)) {
    return `\`${name}\` — это id, его ищут через решётку.`;
  }

  const near = closest(name, pool);
  if (!near) return null;
  const where = labels?.[near];
  return where
    ? `${where[0].toUpperCase()}${where.slice(1)} выбито \`${near}\`, у тебя \`${name}\`.`
    : `В комнате есть \`${mark}${near}\`, у тебя \`${selector}\`.`;
};

// Имя из списка, написанное с другим регистром: classlist вместо classList.
const wrongCase = (code) => {
  for (const name of KNOWN) {
    const found = code.match(new RegExp(`\\b${name}\\b`, `i`));
    if (!found || found[0] === name) continue;
    const at = [...name].findIndex((letter, i) => letter !== found[0][i]);
    return `Регистр важен: \`${name}\`, с большой \`${name[at]}\`.`;
  }
  return null;
};

// error — { text, line, column } из песочницы; context —
// { code, ids, classes, labels: { lamp: `на лампе` }, typed: [селекторы] }.
export const explainError = (error, context) => {
  const { name, message } = split(error.text);
  const rule = RULES.find(({ test }) => test.test(message));
  const facts = rule ? rule.read(message.match(rule.test)) : { parts: [] };
  const code = withoutComments(context.code);

  // Неверный селектор — тоже SyntaxError, но код при этом прочитан и запущен.
  const kind =
    name === `SyntaxError` && facts.badSelector !== undefined
      ? `здесь не прочитался не код, а селектор. Код рубильник принял и встал в зацеп`
      : KINDS[name];
  const parts = [
    ...(kind
      ? [[name, kind]]
      : name
        ? [[name, `так браузер называет этот вид ошибки`]]
        : []),
    ...facts.parts,
  ];

  const sentences = [];

  if (facts.value === `null` && facts.property) {
    sentences.push(`querySelector ничего не нашёл и вернул null.`);
    const advice = (context.typed ?? [])
      .map((selector) => selectorAdvice(selector, context))
      .find(Boolean);
    if (advice) sentences.push(advice);
  } else if (facts.value === `undefined` && facts.property) {
    const left = `Слева от .${facts.property} ничего нет.`;
    sentences.push(
      `${left} ${wrongCase(code) ?? `Проверь, как написано имя перед ним.`}`,
    );
  }

  if (facts.method) {
    const near = closest(facts.method, KNOWN);
    if (NOT_ACTIONS[facts.method]) {
      sentences.push(`\`${facts.method}\` — ${NOT_ACTIONS[facts.method]}`);
    } else {
      sentences.push(
        near
          ? `Метода \`${facts.method}\` нет. Похоже на \`${near}\`.`
          : `Метода \`${facts.method}\` нет.`,
      );
    }
  }

  if (facts.undefinedName) {
    const near = closest(facts.undefinedName, KNOWN);
    const word = facts.undefinedName;
    sentences.push(
      near
        ? `Похоже на \`${near}\`.`
        : `Без кавычек \`${word}\` — чьё-то имя, а такого имени нет. Текст пишут в кавычках: \`${word}\`.`,
    );
  }

  if (facts.badSelector === `.`) {
    sentences.push(`После точки нужно имя класса, например \`.door-lamp\`.`);
  } else if (facts.badSelector !== undefined) {
    sentences.push(`После # нужно имя, например \`#lamp\`.`);
  }

  if (facts.spacedToken) {
    const last = facts.spacedToken.trim().split(/\s+/).at(-1);
    sentences.push(
      `Здесь добавляют один класс, без пробелов. Что у вещи уже есть, добавлять не надо: только \`${last}\`.`,
    );
  }
  if (facts.emptyToken)
    sentences.push(`В кавычках ничего нет. Напиши имя класса.`);

  if (facts.privateField) {
    sentences.push(
      `Селектор — это строка, то есть текст в кавычках: \`${facts.privateField}\`.`,
    );
  }
  if (facts.bracket) {
    sentences.push(`Каждая открытая скобка где-то закрывается.`);
  }
  if (facts.leftSide && /background-color/.test(code)) {
    sentences.push(
      `Дефис в JS — это минус: \`background\` минус \`color\`. В JS пишут \`backgroundColor\`.`,
    );
  }
  if (facts.strayWord) {
    sentences.push(
      `Текст пишут в обратных кавычках. Без них это имена подряд, а имена так не ставят.`,
    );
  }
  if (facts.strayMark) {
    const color = code.match(/=\s*(#\w+)/)?.[1];
    if (color) {
      sentences.push(`Цвет для CSS — это строка: \`${color}\`, в кавычках.`);
    }
  }

  // Незакрытая кавычка: её не видно глазами, поэтому о ней прямо. Русская
  // раскладка здесь — частая причина: закрывающая набралась как ё.
  const openQuote = facts.unfinished && code.split(`\``).length % 2 === 0;
  if (openQuote && /ё/i.test(code)) {
    sentences.push(
      `Кавычка не закрылась: в русской раскладке набралась ё. Русские буквы — в русской раскладке, кавычка — в английской.`,
    );
  } else if (openQuote) {
    sentences.push(`Строка открыта кавычкой \` и не закрыта.`);
  }

  if (name === `SyntaxError` && facts.badSelector === undefined) {
    sentences.push(
      `Код не выполнился ни одной строкой. Засечка — там, где чтение споткнулось.`,
    );
  }

  if (!openQuote) sentences.push(...layoutAdvice(code));

  return {
    text: error.text,
    line: error.line,
    column: error.column,
    parts,
    sentences,
  };
};
