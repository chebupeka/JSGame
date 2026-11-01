// Чистые функции агента песочницы. Их импортирует и агент, и `node --test`.
// Нужные встроенные функции сохранены здесь при загрузке, до кода игрока:
// он может сломать прототипы, а разбор ошибок и снимки должны работать.
// Поэтому здесь нет for-of, spread и методов массивов.
const apply = Reflect.apply;
const exec = RegExp.prototype.exec;

// Строка и столбец ошибки в файле игрока. В стеке V8 место выглядит как
// `at blob:http://…/uuid:4:3` (или в скобках после имени функции),
// у Firefox — `@blob:http://…/uuid:4:3`.
export const locate = (stack, url) => {
  if (typeof stack !== `string`) return null;

  const place = /(blob:[^\s()]+?):(\d+):(\d+)/g;
  let match;
  while ((match = apply(exec, place, [stack])) !== null) {
    if (match[1] === url) return { line: +match[2], column: +match[3] };
  }

  return null;
};

// Реестр вещей: ключ манифеста → сам элемент. Вещь привязана к элементу,
// а не к селектору, поэтому после `lamp.id = 'x'` лампа не теряется.
export const bindThings = (things, find) => {
  const bound = {};
  for (let i = 0; i < things.length; i++) {
    bound[things[i].key] = find(things[i].selector);
  }
  return bound;
};

// Снимок одной вещи. read — сохранённые агентом геттеры (в тестах — подделки).
export const readThing = (element, read) => {
  if (!element || !read.isConnected(element)) return { present: false };

  const box = read.rect(element);
  return {
    present: true,
    id: read.id(element),
    className: read.className(element),
    background: read.background(element),
    rect: { x: box.x, y: box.y, width: box.width, height: box.height },
  };
};

// Ответ превью: что находит каждый селектор. queryAll — сохранённый агентом
// querySelectorAll (бросает на неверном селекторе), keyOf — какая это вещь
// манифеста. Только чтение: комнату это не меняет.
export const matchSelectors = (selectors, queryAll, read, keyOf) => {
  const out = [];
  for (let i = 0; i < selectors.length; i++) {
    let found;
    try {
      found = queryAll(selectors[i]);
    } catch {
      out[i] = { valid: false, count: 0, rects: [], keys: [] };
      continue;
    }

    const rects = [];
    const keys = [];
    for (let j = 0; j < found.length && j < 8; j++) {
      rects[j] = read.rect(found[j]);
      keys[j] = keyOf(found[j]) ?? null;
    }
    out[i] = { valid: true, count: found.length, rects, keys };
  }
  return out;
};

export const snapshot = (things, bound, read) => {
  const out = {};
  for (let i = 0; i < things.length; i++) {
    const { key } = things[i];
    out[key] = readThing(bound[key], read);
  }
  return out;
};
