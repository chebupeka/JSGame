// Справка по наведению мыши на слово в коде. Как пометки на полях (§2):
// сначала смысл обычными словами, потом термин, где можно — где то же
// самое найти в настоящем браузере. mdn — как эта страница называется на MDN
// (по-английски: документация почти вся на нём, и искать надо так).
const word = (text, mdn) => ({ text, mdn });

const IF_ELSE = word(
  `Если условие верно — первые строки, иначе — строки после else.`,
  `if...else`,
);
const BOOLEAN = word(`Ответ на вопрос: «да» и «нет».`, `Boolean`);
const LOOP = word(
  `Цикл: строки для каждой вещи списка. break — выйти из цикла.`,
  `for...of`,
);
const TRUTHINESS = word(
  `Как if понимает значение. Falsy, «нет»: false, 0, пустая строка, null, undefined, NaN. Всё остальное — truthy, «да».`,
  `Truthy, Falsy`,
);
const TRY = word(
  `Попробовать, а если упало — выполнить запасное.`,
  `try...catch`,
);

export const WORDS = {
  document: word(
    `Вся страница целиком, какой её видит JavaScript: вся станция. В F12 это вкладка Elements.`,
    `Document`,
  ),
  querySelector: word(
    `Найти первую вещь, которая подходит под селектор. Если такой нет — вернёт null, «ничего».`,
    `Document.querySelector()`,
  ),
  querySelectorAll: word(
    `Найти все вещи, которые подходят под селектор. Вернёт список, он может быть пустым.`,
    `Document.querySelectorAll()`,
  ),
  classList: word(
    `Список классов вещи. У него есть add, remove и toggle.`,
    `Element.classList`,
  ),
  add: word(
    `classList.add добавляет вещи класс. Если класс уже есть, ничего не меняется.`,
    `DOMTokenList.add()`,
  ),
  remove: word(
    `classList.remove убирает у вещи класс.`,
    `DOMTokenList.remove()`,
  ),
  toggle: word(
    `classList.toggle: класса нет — добавит, есть — уберёт.`,
    `DOMTokenList.toggle()`,
  ),
  contains: word(
    `Есть ли у вещи класс. Отвечает true или false.`,
    `DOMTokenList.contains()`,
  ),
  const: word(
    `const даёт значению имя. Поменять, что лежит под этим именем, потом нельзя.`,
    `const`,
  ),
  let: word(`let даёт значению имя, которое потом можно поменять.`, `let`),
  addEventListener: word(
    `Повесить на вещь датчик: когда придёт событие, выполнится функция.`,
    `EventTarget.addEventListener()`,
  ),
  input: word(
    `input — на каждый щелчок, пока крутят. change — один раз, когда отпустят.`,
    `Element: input event`,
  ),
  change: word(
    `change — один раз, когда отпустили. input — на каждый щелчок, пока крутят.`,
    `HTMLElement: change event`,
  ),
  click: word(`Щелчок по вещи.`, `Element: click event`),
  evt: word(
    `evt — само событие. Его передаёт браузер, когда датчик срабатывает.`,
    `Event`,
  ),
  target: word(
    `evt.target — вещь, на которой случилось событие.`,
    `Event.target`,
  ),
  value: word(
    `value — что сейчас стоит в поле или на ручке. У ручки цвета это цвет.`,
    `HTMLInputElement: value property`,
  ),
  style: word(
    `style — стили самой вещи. Записал свойство — вещь сразу меняется.`,
    `HTMLElement.style`,
  ),
  backgroundColor: word(
    `backgroundColor — цвет фона. У окна это цвет стекла.`,
    `background-color`,
  ),
  textContent: word(
    `Текст внутри вещи. Положил новый — старый пропал.`,
    `Node.textContent`,
  ),
  null: word(`«Ничего»: искали, а такого нет.`, `null`),
  undefined: word(
    `Значения нет: такого имени нет или туда ничего не положили.`,
    `undefined`,
  ),
  div: word(
    `Так вещь записана на странице: это HTML. id — её имя, оно одно на всю станцию. class — метка, она бывает на многих вещах. Настоящее имя вещи — элемент.`,
    `<div>: The Content Division element`,
  ),
  CSS: word(
    `Правила, как вещи выглядят. Их написала станция, видно «под корпусом».`,
    `CSS`,
  ),
  обработчик: word(
    `Функция, которую отдают датчику. Срабатывает на событие.`,
    `Introduction to events`,
  ),
  forEach: word(
    `Пройти по списку: функция сработает для каждой вещи по очереди.`,
    `NodeList.forEach()`,
  ),
  dataset: word(
    `Бумажные бирки вещи: data-имя читается как dataset.имя. Всегда строка.`,
    `HTMLElement.dataset`,
  ),
  if: IF_ELSE,
  else: IF_ELSE,
  true: BOOLEAN,
  false: BOOLEAN,
  Number: word(`Перевести строку с цифрами в число.`, `Number() constructor`),
  truthy: TRUTHINESS,
  falsy: TRUTHINESS,
  return: word(`Выйти из функции сразу. Строки ниже не выполнятся.`, `return`),
  for: LOOP,
  of: LOOP,
  break: LOOP,
  console: word(`Лента телетайпа. В F12 это вкладка Console.`, `console`),
  log: word(`Лента телетайпа. В F12 это вкладка Console.`, `console.log()`),
  DOM: word(
    `Все вещи страницы (элементы) вместе: дерево, кто в ком лежит. JavaScript работает с ним. В F12 это вкладка Elements.`,
    `Document Object Model (DOM)`,
  ),
  debugger: word(
    `Стоп-кадр на этой строке. В F12 это вкладка Sources.`,
    `debugger`,
  ),
  F12: word(
    `Инструменты браузера: Console, Elements, Sources и другие. Открываются на любой странице.`,
    `What are browser developer tools?`,
  ),
  localStorage: word(
    `Хранилище страницы: положить и взять строку под ключом. В F12 это вкладка Application.`,
    `Window.localStorage`,
  ),
  setItem: word(
    `Положить строку в хранилище под ключом. В F12 это вкладка Application.`,
    `Storage.setItem()`,
  ),
  getItem: word(
    `Взять строку из хранилища по ключу. В F12 это вкладка Application.`,
    `Storage.getItem()`,
  ),
  JSON: word(`Объект в строку и строку в объект.`, `JSON`),
  stringify: word(`Объект в строку.`, `JSON.stringify()`),
  parse: word(`Строку в объект.`, `JSON.parse()`),
  try: TRY,
  catch: TRY,
};

// Знаки: слова у них нет, справку ищем по самому знаку.
export const SIGNS = {
  "//": word(`Заметка для людей. Браузер такую строку пропускает.`, `Comments`),
  "=": word(
    `Положить то, что справа, в то, что слева. Сравнивают другими знаками.`,
    `Assignment (=)`,
  ),
  "=>": word(
    `Стрелка: слева то, что функция получает, справа её строки.`,
    `Arrow function expressions`,
  ),
};

// Какой знак под мышью. pos — символ под ней, line — текст строки, at — его
// место в строке. Знаки сравнения (==, ===, !=, <=, >=) — не присваивание.
export const signAt = (line, at) => {
  const comment = line.indexOf(`//`);
  if (comment !== -1 && (at === comment || at === comment + 1)) return `//`;
  // В заметке знаки — это текст, а не код.
  if (comment !== -1 && at > comment) return null;

  const char = line[at];
  if (char !== `=` && char !== `>`) return null;
  if (line.slice(at, at + 2) === `=>` || line.slice(at - 1, at + 1) === `=>`) {
    return `=>`;
  }
  if (char !== `=`) return null;

  const before = line[at - 1];
  const after = line[at + 1];
  return after === `=` || /[=!<>]/.test(before ?? ``) ? null : `=`;
};

export const SELECTOR_MARKS = {
  "#": `Решётка в селекторе значит «по id»: #lamp — вещь с id="lamp".`,
  ".": `Точка в начале селектора значит «по классу»: .lamp — все вещи с классом lamp.`,
};
