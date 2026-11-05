// Чистые функции агента песочницы. Их импортирует и агент, и `node --test`.
// Нужные встроенные функции сохранены здесь при загрузке, до кода игрока:
// он может сломать прототипы, а разбор ошибок и снимки должны работать.
// Поэтому здесь нет for-of, spread и методов массивов.
const apply = Reflect.apply;
const exec = RegExp.prototype.exec;
const NativeWeakMap = WeakMap;
const mapGet = WeakMap.prototype.get;
const mapSet = WeakMap.prototype.set;

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

// Где код игрока вызвал обёртку агента: первый кадр стека из blob-файла.
// Кадры самого агента не из blob и пропускаются. V8 пишет место вызова
// метода по его имени: у `document.querySelector(…)` это `querySelector`.
export const callSite = (stack) => {
  if (typeof stack !== `string`) return null;

  const match = apply(exec, /(blob:[^\s()]+?):(\d+):(\d+)/, [stack]);
  return match ? { url: match[1], line: +match[2], column: +match[3] } : null;
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
    tag: read.tag(element),
    className: read.className(element),
    background: read.background(element),
    // У поля ввода — его настоящее значение (у ручки — цвет).
    value: read.value(element),
    // Текст внутри вещи (у табло — то, что на нём написано).
    text: read.text(element),
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

// Сторож циклов: `__g()` стоит первой инструкцией в теле каждого цикла
// (src/code/instrument.js). Отсчёт идёт, пока поток не освободился: первая
// проверка заводит таймер на 0 мс (later), и раз он сработал — поток
// отдохнул, и следующий цикл (на следующем событии, после await) считается
// с нуля. Синхронный бесконечный цикл таймер не пустит — через limit мс
// HALT. Пойманный HALT не спасает: пока поток не отдохнул, каждый
// следующий `__g()` бросает снова. Если таймеры притормозил браузер
// (вкладка в фоне), новый отсчёт даёт и пауза дольше gap мс.
export const HALT = Object.freeze({ halt: `сторож прервал цикл` });

export const createGuard = (clock, later, { limit = 800, gap = 50 } = {}) => {
  let since = null;
  let last = -Infinity;
  let tripped = false;
  const rest = () => {
    since = null;
  };

  return () => {
    const now = clock();
    if (since === null || now - last > gap) {
      if (since === null) later(rest);
      since = now;
      tripped = false;
    }
    last = now;
    if (tripped || now - since > limit) {
      tripped = true;
      throw HALT;
    }
  };
};

// Слушатели игрока — датчики (MECHANICS.md §3.2). Вместо функции игрока
// браузер получает нашу обёртку: она сообщает о событии и зовёт функцию.
// Браузер не добавляет одну функцию дважды на ту же вещь с тем же типом
// и capture и снимает её по тем же признакам, поэтому обёртка одна на
// четвёрку (вещь, функция, тип, capture) — тогда дубли, remove, once и
// signal работают как без нас, а у каждой вещи свой датчик. Ошибку
// обработчика бросаем дальше: браузер напишет её сам, дословно. add
// и remove — настоящие методы, сохранённые заранее.
const create = Object.create;

export const createListeners = ({ add, remove, on }) => {
  const registry = new NativeWeakMap();
  let lastId = 0;

  const captureOf = (options) =>
    typeof options === `boolean` ? options : !!(options && options.capture);

  const entryOf = (target, listener, type, capture, make) => {
    let byListener = apply(mapGet, registry, [target]);
    if (!byListener) {
      if (!make) return null;
      byListener = new NativeWeakMap();
      apply(mapSet, registry, [target, byListener]);
    }
    let byKind = apply(mapGet, byListener, [listener]);
    if (!byKind) {
      if (!make) return null;
      byKind = create(null);
      apply(mapSet, byListener, [listener, byKind]);
    }

    const kind = (capture ? `1:` : `0:`) + type;
    if (!byKind[kind] && make) {
      lastId += 1;
      const id = lastId;
      const wrapper = function () {
        on.fire(this, type, id, arguments[0]);
        try {
          const result =
            typeof listener === `function`
              ? apply(listener, this, arguments)
              : apply(listener.handleEvent, listener, arguments);
          on.done(this, type, id, null);
          return result;
        } catch (error) {
          on.done(this, type, id, error);
          throw error;
        }
      };
      byKind[kind] = { wrapper, id };
    }
    return byKind[kind] || null;
  };

  // Не вещь, не строка в типе или не функция — пусть решает сам браузер:
  // его ошибка и его поведение, без нашей обёртки.
  const traceable = (target, type, listener) =>
    target !== null &&
    (typeof target === `object` || typeof target === `function`) &&
    typeof type === `string` &&
    (typeof listener === `function` ||
      (typeof listener === `object` && listener !== null));

  return {
    add: function (type, listener, options) {
      if (!traceable(this, type, listener)) return apply(add, this, arguments);

      const capture = captureOf(options);
      const { wrapper, id } = entryOf(this, listener, type, capture, true);
      const result = apply(add, this, [type, wrapper, options]);
      const once = !!(options && typeof options === `object` && options.once);
      const signal = options && typeof options === `object` && options.signal;
      // Уже отменённый signal: браузер слушателя не добавил.
      if (signal && signal.aborted) return result;

      on.add(this, type, id, once);
      if (signal) {
        const target = this;
        apply(add, signal, [
          `abort`,
          () => on.remove(target, type, id),
          { once: true },
        ]);
      }
      return result;
    },

    remove: function (type, listener, options) {
      if (!traceable(this, type, listener)) {
        return apply(remove, this, arguments);
      }

      const found = entryOf(this, listener, type, captureOf(options), false);
      if (!found) return apply(remove, this, arguments);
      const result = apply(remove, this, [type, found.wrapper, options]);
      on.remove(this, type, found.id);
      return result;
    },
  };
};
