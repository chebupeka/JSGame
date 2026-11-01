import {
  HALT,
  bindThings,
  callSite,
  createGuard,
  locate,
  matchSelectors,
  snapshot,
} from "./core.js";

// Агент песочницы. Загружается первым и сохраняет настоящие функции
// браузера до кода игрока. Безопасность даёт отдельный origin, а это —
// чтобы эксперимент игрока (`Array.prototype.push = null` и т. п.)
// не ломал снимки комнаты. Поэтому здесь нет for-of, spread и методов
// массивов, а всё вызывается через сохранённый Reflect.apply.
const GAME_ORIGINS = [`http://localhost:5173`];

// Сколько событий показа по шагам пишем за запуск. Дальше показывать
// всё равно нечего: цикл на тысячу шагов медленно не смотрят.
const LIMIT = 300;

const apply = Reflect.apply;
const describe = Object.getOwnPropertyDescriptor;
const getter = (proto, name) => describe(proto, name).get;
const setter = (proto, name) => describe(proto, name).set;

const win = window;
const doc = document;
const ownOrigin = location.origin;
const NativeBlob = Blob;
const NativeMutationObserver = MutationObserver;
const NativeError = Error;
const define = Object.defineProperty;

const native = {
  querySelector: Document.prototype.querySelector,
  querySelectorAll: Document.prototype.querySelectorAll,
  elementQuery: Element.prototype.querySelector,
  elementQueryAll: Element.prototype.querySelectorAll,
  listLength: getter(NodeList.prototype, `length`),
  listItem: NodeList.prototype.item,
  id: getter(Element.prototype, `id`),
  outerHTML: getter(Element.prototype, `outerHTML`),
  indexOf: String.prototype.indexOf,
  slice: String.prototype.slice,
  mapGet: WeakMap.prototype.get,
  mapSet: WeakMap.prototype.set,
  portStart: MessagePort.prototype.start,
  eventData: getter(MessageEvent.prototype, `data`),
  createElement: Document.prototype.createElement,
  head: getter(Document.prototype, `head`),
  body: getter(Document.prototype, `body`),
  root: getter(Document.prototype, `documentElement`),
  appendChild: Node.prototype.appendChild,
  setText: setter(Node.prototype, `textContent`),
  setHtml: setter(Element.prototype, `innerHTML`),
  className: getter(Element.prototype, `className`),
  isConnected: getter(Node.prototype, `isConnected`),
  rect: Element.prototype.getBoundingClientRect,
  rectX: getter(DOMRectReadOnly.prototype, `x`),
  rectY: getter(DOMRectReadOnly.prototype, `y`),
  rectWidth: getter(DOMRectReadOnly.prototype, `width`),
  rectHeight: getter(DOMRectReadOnly.prototype, `height`),
  computedStyle: win.getComputedStyle,
  propertyValue: CSSStyleDeclaration.prototype.getPropertyValue,
  listen: EventTarget.prototype.addEventListener,
  unlisten: EventTarget.prototype.removeEventListener,
  post: MessagePort.prototype.postMessage,
  observe: MutationObserver.prototype.observe,
  takeRecords: MutationObserver.prototype.takeRecords,
  setTimeout: win.setTimeout,
  scrollTo: win.scrollTo,
  createObjectURL: URL.createObjectURL,
  then: Promise.prototype.then,
  errorText: Error.prototype.toString,
  now: Performance.prototype.now,
};
const clock = () => apply(native.now, performance, []);

const read = {
  isConnected: (element) => apply(native.isConnected, element, []),
  id: (element) => apply(native.id, element, []),
  // Открывающий тег, как в F12: <div id="lamp" class="lamp on">.
  tag: (element) => {
    const html = apply(native.outerHTML, element, []);
    return apply(native.slice, html, [
      0,
      apply(native.indexOf, html, [`>`]) + 1,
    ]);
  },
  className: (element) => apply(native.className, element, []),
  background: (element) =>
    apply(native.propertyValue, apply(native.computedStyle, win, [element]), [
      `background-color`,
    ]),
  rect: (element) => {
    const box = apply(native.rect, element, []);
    return {
      x: apply(native.rectX, box, []),
      y: apply(native.rectY, box, []),
      width: apply(native.rectWidth, box, []),
      height: apply(native.rectHeight, box, []),
    };
  },
};

const isGameOrigin = (origin) => {
  for (let i = 0; i < GAME_ORIGINS.length; i++) {
    if (GAME_ORIGINS[i] === origin) return true;
  }
  return false;
};

// Ошибку передаём дословно, как её напечатал бы браузер в консоли.
const describeError = (error) => {
  const isObject =
    error !== null &&
    (typeof error === `object` || typeof error === `function`);
  return {
    text: isObject ? apply(native.errorText, error, []) : String(error),
    stack: isObject ? error.stack : undefined,
  };
};

// Метка инструкции, которую ставит src/code/instrument.js: `__s(n);`.
// Свойство неперезаписываемое — код игрока не сломает показ по шагам.
let onStep = null;
define(win, `__s`, {
  value: (n) => {
    if (onStep) onStep(n);
  },
});

// Сторож цикла — тоже метка из instrument.js. Цикл без передышки дольше
// 0,8 с прерывается, и игра узнаёт об этом сразу, а не по пропавшему пульсу.
const guard = createGuard(clock);
define(win, `__g`, { value: () => guard() });

const buildRoom = ({ html, css }) => {
  const style = apply(native.createElement, doc, [`style`]);
  apply(native.setText, style, [css]);
  apply(native.appendChild, apply(native.head, doc, []), [style]);
  apply(native.setHtml, apply(native.body, doc, []), [html]);
};

const start = (port, { room, things, files, view, trace }) => {
  const send = (message) => apply(native.post, port, [message]);

  buildRoom(room);
  // Станция — все комнаты друг под другом. На экране одна: прокручиваем
  // к ней, и рамки её вещей совпадают с пикселями сцены.
  const scroll = () => apply(native.scrollTo, win, [0, view]);
  scroll();
  const find = (selector) => apply(native.querySelector, doc, [selector]);
  const roomRoot = find(room.root);
  const bound = bindThings(things, find);

  // Обратный реестр: элемент → ключ вещи манифеста.
  const keys = new WeakMap();
  for (let i = 0; i < things.length; i++) {
    const element = bound[things[i].key];
    if (element) apply(native.mapSet, keys, [element, things[i].key]);
  }
  const keyOf = (element) => apply(native.mapGet, keys, [element]);

  const items = (list) => {
    const out = [];
    const length = apply(native.listLength, list, []);
    for (let i = 0; i < length; i++) {
      out[i] = apply(native.listItem, list, [i]);
    }
    return out;
  };
  const queryAll = (selector) =>
    items(apply(native.querySelectorAll, doc, [selector]));

  // Превью спрашивает, что находят селекторы. Отвечаем настоящим
  // querySelectorAll — только чтение, комната от этого не меняется.
  apply(native.listen, port, [
    `message`,
    (event) => {
      const data = apply(native.eventData, event, []);
      if (!data || data.type !== `query`) return;
      send({
        type: `matches`,
        id: data.id,
        results: matchSelectors(data.selectors, queryAll, read, keyOf),
      });
    },
  ]);
  apply(native.portStart, port, []);

  const world = () => ({
    room: { present: !!roomRoot && read.isConnected(roomRoot) },
    things: snapshot(things, bound, read),
  });
  const sendSnapshot = () => send({ type: `snapshot`, world: world() });

  // Показ по шагам: что делал код игрока и в каком порядке. Только
  // в мире — в превью кода игрока нет.
  let recorded = 0;
  const record = (build) => {
    if (!trace || recorded > LIMIT) return;
    recorded += 1;
    send({
      type: `trace`,
      event: recorded > LIMIT ? { kind: `limit` } : build(),
    });
  };
  const changed = () => record(() => ({ kind: `change`, world: world() }));

  // Любое изменение страницы — новый снимок, не чаще раза за такт.
  let pending = false;
  const scheduleSnapshot = () => {
    if (pending) return;
    pending = true;
    apply(native.setTimeout, win, [
      () => {
        pending = false;
        sendSnapshot();
      },
      0,
    ]);
  };
  const observer = new NativeMutationObserver(() => {
    changed();
    scheduleSnapshot();
  });
  apply(native.observe, observer, [
    apply(native.root, doc, []),
    { attributes: true, childList: true, subtree: true, characterData: true },
  ]);

  // iframe в отдельном процессе получает свой размер от браузера не сразу:
  // до этого раскладки нет и все рамки 0×0. Пришёл размер — новый снимок.
  apply(native.listen, win, [
    `resize`,
    () => {
      scroll();
      scheduleSnapshot();
    },
  ]);

  // Пульс: пропал дольше секунды — игра считает песочницу зависшей.
  const pulse = () => {
    send({ type: `pulse` });
    apply(native.setTimeout, win, [pulse, 250]);
  };
  pulse();
  sendSnapshot();

  // Каждый файл — модуль из blob-URL: номера строк совпадают с файлом.
  // Адреса готовим заранее, пока код игрока ещё ничего не сломал.
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const blob = new NativeBlob([files[i].code], { type: `text/javascript` });
    urls[i] = apply(native.createObjectURL, URL, [blob]);
  }
  const fileOf = (url) => {
    for (let i = 0; i < urls.length; i++) {
      if (urls[i] === url) return files[i].name;
    }
    return null;
  };

  // Поиск: что нашёл и где в коде его вызвали. Только для кода игрока —
  // у вызова без blob-файла в стеке места нет, и он не пишется.
  const found = (selector, result, all) => {
    const site = callSite(new NativeError().stack);
    if (!site) return;

    const elements = all ? items(result) : result ? [result] : [];
    const keys = [];
    const rects = [];
    for (let i = 0; i < elements.length && i < 8; i++) {
      keys[i] = keyOf(elements[i]) ?? null;
      rects[i] = read.rect(elements[i]);
    }
    record(() => ({
      kind: `find`,
      file: fileOf(site.url),
      line: site.line,
      column: site.column,
      selector: typeof selector === `string` ? selector : null,
      all,
      count: elements.length,
      keys,
      rects,
    }));
  };

  // Обёртка зовёт настоящий метод с теми же аргументами, поэтому
  // результат и текст ошибок те же. Запись ошибкой не кончится никогда.
  const wrapFind = (proto, name, original, all) => {
    const wrapper = {
      [name]() {
        const result = apply(original, this, arguments);
        try {
          found(arguments[0], result, all);
        } catch {
          // Показ без этого шага лучше, чем сломанный код игрока.
        }
        return result;
      },
    }[name];
    define(proto, name, {
      value: wrapper,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  };

  if (trace) {
    const { prototype: page } = Document;
    const { prototype: element } = Element;
    wrapFind(page, `querySelector`, native.querySelector, false);
    wrapFind(page, `querySelectorAll`, native.querySelectorAll, true);
    wrapFind(element, `querySelector`, native.elementQuery, false);
    wrapFind(element, `querySelectorAll`, native.elementQueryAll, true);

    // Всё, что поменяла прошлая инструкция, — её шаг, до начала этой.
    // Изменения последней инструкции заберёт сам наблюдатель.
    onStep = (n) => {
      if (apply(native.takeRecords, observer, []).length) {
        changed();
        scheduleSnapshot();
      }
      record(() => ({ kind: `step`, n }));
    };
  }

  const runFrom = (i) => {
    if (i >= files.length) {
      sendSnapshot();
      send({ type: `done` });
      return;
    }

    apply(native.then, import(urls[i]), [
      () => runFrom(i + 1),
      (error) => {
        if (error === HALT) {
          send({ type: `halt`, file: files[i].name });
          runFrom(i + 1);
          return;
        }

        const { text, stack } = describeError(error);
        const place = locate(stack, urls[i]);
        send({
          type: `error`,
          file: files[i].name,
          text,
          line: place ? place.line : null,
          column: place ? place.column : null,
        });
        runFrom(i + 1);
      },
    ]);
  };
  runFrom(0);
};

const onHello = (event) => {
  if (event.source !== parent || !isGameOrigin(event.origin)) return;
  apply(native.unlisten, win, [`message`, onHello]);

  // На том же origin, что и игра, код игрока дотянулся бы до неё.
  // Тогда лучше не работать совсем.
  if (event.origin === ownOrigin) return;

  start(event.ports[0], event.data);
};

apply(native.listen, win, [`message`, onHello]);
parent.postMessage({ type: `ready` }, `*`);
