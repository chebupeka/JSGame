import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/400-italic.css";
import "@fontsource/tiny5/400.css";
import "./style.css";

import { parse } from "acorn";

import { explainError } from "./code/errors.js";
import { instrument } from "./code/instrument.js";
import { createLivePreview } from "./code/live.js";
import { findQueries } from "./code/preview.js";
import { createGirl, girlBox, resetGirl, updateGirl } from "./girl/girl.js";
import { loadProgress, saveProgress } from "./progress.js";
import { drawScene } from "./render/scene.js";
import { loadSprites } from "./render/sprites.js";
import { STENCIL_FONT, plateText } from "./render/stencil.js";
import {
  SWITCHBOARD_NAMES,
  SWITCHBOARD_ROOM,
  SWITCHBOARD_THINGS,
} from "./rooms/switchboard/manifest.js";
import { hasClass } from "./rooms/switchboard/things.js";
import { createSandbox } from "./sandbox/host.js";
import { LAYOUTS, applyLayout } from "./screen/layout.js";
import { SCENE, applyFrame, watchFrame } from "./screen/scale.js";
import { LAMP_TASK } from "./tasks/lamp.js";
import { createEditor } from "./terminal/editor.js";
import { isInside } from "./terminal/lever.js";
import { createReplay } from "./trace/replay.js";
import { setNotch } from "./terminal/marks.js";
import { errorNotes, rawNote, showNotes } from "./terminal/notes.js";
import { SELECTOR_MARKS, WORDS } from "./terminal/words.js";

const TASK = LAMP_TASK;
const SMALL = `Разверни окно или нажми F11.`;
const HANG = `Код не закончился и за секунду. Похоже на бесконечный цикл. Станция перезапущена, можно запускать снова.`;
const UNKNOWN = `Узнаем при запуске. Заранее тут честно не сказать: селектор собирается на ходу, ищет не от document или код выше меняет страницу.`;

const frame = document.querySelector(`#frame`);
const canvas = document.querySelector(`#scene`);
const ctx = canvas.getContext(`2d`);

const state = {
  layout: LAYOUTS.large,
  scale: 4,
  overlays: [],
  world: null,
  girl: createGirl(),
  lever: { closed: false, bounced: null },
  breaker: { tripped: false },
  // null — пометка при входе в задачу; иначе — то, что случилось (ошибка).
  notes: null,
  hint: 0,
  wires: [],
};

const render = (time = performance.now()) => drawScene(ctx, state, time);

// Пометка при входе в задачу и последняя открытая подсказка.
const entryNotes = () => [
  ...TASK.notes,
  ...TASK.hints.slice(0, state.hint).slice(-1),
];

// На ×3 и меньше код мельче 12 px: игра работает, но лучше крупнее.
const refreshNotes = () =>
  showNotes(
    ...(state.scale < 4 ? [SMALL] : []),
    ...(state.notes ?? entryNotes()),
  );

// Щелчок по полям — следующая подсказка, каждая конкретнее предыдущей.
// Подсказки бесплатные, ничего не считается. Разбор ошибки при этом
// остаётся на месте, подсказка встаёт под ним.
document.querySelector(`#notes`).addEventListener(`click`, () => {
  state.hint = Math.min(TASK.hints.length, state.hint + 1);
  refreshNotes();
});

// Код последнего запуска: разбор ошибки говорит о нём, а не о том,
// что уже успели напечатать после.
let lastRun = ``;

// Где браузер споткнулся, читая код: отклонённый import() этого не сообщает,
// а строгий разбор acorn знает строку и столбец.
const syntaxPlace = (code) => {
  try {
    parse(code, { ecmaVersion: `latest`, sourceType: `module` });
    return null;
  } catch ({ loc }) {
    return loc ? { line: loc.line, column: loc.column + 1 } : null;
  }
};

const positionOf = ({ line, column }) => {
  const { doc } = editor.state;
  const target = doc.line(Math.min(line, doc.lines));
  return Math.min(target.to, target.from + Math.max(0, (column ?? 1) - 1));
};

// Ошибка: текст браузера дословно, разбор по частям, фраза по-русски,
// «похоже на» по настоящим именам в комнате. Щелчок по «строка N» ставит
// туда курсор, у SyntaxError в коде засечка.
const showError = (error) => {
  const place = isSyntax(error) ? syntaxPlace(lastRun) : null;
  const located = place ? { ...error, ...place } : error;
  const typed = findQueries(lastRun)
    .filter(({ status }) => status === `check`)
    .map(({ selector }) => selector);
  const explained = explainError(located, {
    code: lastRun,
    typed,
    ...SWITCHBOARD_NAMES,
  });

  state.notes = errorNotes(explained, () => {
    editor.dispatch({
      selection: { anchor: positionOf(located) },
      scrollIntoView: true,
    });
    editor.focus();
  });
  if (place) editor.dispatch({ effects: setNotch.of(positionOf(place)) });
  refreshNotes();
};

// Ошибка в мире (MECHANICS.md §3.3). SyntaxError: файл не прочитан,
// не выполнилась ни одна строка — рубильник не встаёт в зацеп и отскакивает.
// Ошибка при выполнении выбивает автомат; всё, что код успел, остаётся.
const isSyntax = (error) => error.text.startsWith(`SyntaxError`) && !error.line;

const fail = (error) => {
  if (isSyntax(error)) {
    state.lever.closed = false;
    state.lever.bounced = performance.now();
  } else {
    state.breaker.tripped = true;
  }
  showError(error);
};

// Показ по шагам: всё, что пришло из песочницы, идёт через него — мир
// меняется, ошибка появляется ровно тогда, когда показ до неё дошёл.
const replay = createReplay({
  onWorld: (world) => {
    state.world = world;
  },
  onError: fail,
  onFlash: (keys, from, until) => {
    state.flash = { keys, from, until };
  },
  onSlowShown: () => {
    progress.shown[TASK.file] = true;
    saveProgress(progress);
  },
});
state.trace = replay.view;

// Разметка последнего запуска: столбцы ошибок и мест вызова в размеченном
// коде правее твоих, map() возвращает их назад.
let marked = null;
const unmark = (place) =>
  marked && place.file === TASK.file && place.column
    ? { ...place, column: marked.map(place.line, place.column) }
    : place;

const sandbox = createSandbox({
  worldContainer: document.querySelector(`#sandbox`),
  previewContainer: document.querySelector(`#preview`),
  room: SWITCHBOARD_ROOM,
  things: SWITCHBOARD_THINGS,
  // Решённые файлы станции: в главе 1 их ещё нет.
  solvedFiles: () => [],
  onSnapshot: (world) => replay.receive({ kind: `world`, world }),
  onTrace: (event) => replay.receive(event),
  onError: (error) => replay.receive({ kind: `error`, error: unmark(error) }),
  onDone: () => replay.receive({ kind: `done` }),
  onHang: () => {
    replay.stop();
    state.notes = [HANG];
    refreshNotes();
  },
});

// Редактор меряет ширину знаков, поэтому ждёт, пока шрифт загрузится
// (и латиница, и кириллица).
const [sprites] = await Promise.all([
  loadSprites(),
  document.fonts.load(`1em "JetBrains Mono"`, `a=>Ж`),
  document.fonts.load(`italic 1em "JetBrains Mono"`, `aЖ`),
  document.fonts.load(STENCIL_FONT, `#.-_az09`),
]);
state.sprites = sprites;
ctx.imageSmoothingEnabled = false;

// Прогресс: решённый файл работает на мониторе и в мире после F5,
// черновик не теряется.
const progress = loadProgress();
state.solved = progress.solved[TASK.file] ?? null;
if (state.solved) {
  state.girl.mode = `gone`;
  state.notes = [];
}

// Запуск — как перезагрузка питания: чистая страница, затем твой код.
// Пока задача не решена, она снова стоит у ставня и ждёт, что получится.
// Первый запуск задачи показывается медленно, и свет проседает.
const run = ({ slow = false } = {}) => {
  state.lever.closed = true;
  state.lever.bounced = null;
  state.breaker.tripped = false;
  state.world = null;
  state.notes = null;
  if (!state.solved) resetGirl(state.girl);
  refreshNotes();
  lastRun = editor.state.doc.toString();
  marked = instrument(lastRun);
  editor.dispatch({ effects: setNotch.of(null) });

  const first = !progress.shown[TASK.file];
  replay.start({ slow: slow || first, dip: first, marked, file: TASK.file });
  sandbox.run([{ name: TASK.file, code: marked.code }]);
};

// Успех ничем не объявляется (MECHANICS.md §3.4): она прошла в дверь,
// файл уезжает на монитор на стене и работает там дальше. Несколько
// секунд игра ничего не предлагает — можно просто смотреть.
const succeed = () => {
  state.solved = lastRun;
  progress.solved[TASK.file] = lastRun;
  saveProgress(progress);
  state.notes = [];
  refreshNotes();
};

let saveDraft = null;
const keepDraft = () => {
  clearTimeout(saveDraft);
  saveDraft = setTimeout(() => {
    progress.drafts[TASK.file] = editor.state.doc.toString();
    saveProgress(progress);
  }, 500);
};

document.querySelector(`#nameplate`).textContent = TASK.file;
applyLayout(state.layout);
let live = null;
const editor = createEditor(
  document.querySelector(`#code`),
  progress.drafts[TASK.file] ?? TASK.code,
  {
    onRun: run,
    onChange: (update) => {
      live.onChange(update);
      replay.clearLines();
      keepDraft();
    },
  },
);

// Пока печатаешь, код не выполняется: превью только читает разбор
// и спрашивает у чистой комнаты, что находят селекторы.
live = createLivePreview({
  editor,
  query: sandbox.query,
  onWires: (wires) => {
    state.wires = wires;
  },
});
live.schedule();

// Строка кода → её верх и высота в пикселях сцены. Кромку выполненных
// строк рисует холст, а сами строки живут в редакторе поверх него.
state.lineBoxes = () => {
  const box = canvas.getBoundingClientRect();
  const unit = box.height / SCENE.height;
  const top = editor.documentTop;
  const { doc } = editor.state;
  return (line) => {
    if (line > doc.lines) return null;
    const block = editor.lineBlockAt(doc.line(line).from);
    return {
      top: (top + block.top - box.top) / unit,
      height: block.height / unit,
    };
  };
};

// Наведение мыши: пока мышь на месте, поля показывают справку, а когда
// она ушла — возвращают своё. Справка не всплывает поверх сцены.
let hovering = false;
const hover = (items) => {
  hovering = true;
  showNotes(...items);
};
const unhover = () => {
  if (!hovering) return;
  hovering = false;
  refreshNotes();
};

// Слово в коде — справка о нём; пунктир — почему «узнаем при запуске»;
// # и . в селекторе — «по id» и «по классу».
editor.dom.addEventListener(`mousemove`, (event) => {
  if (event.target.closest(`.cm-unknown`)) return hover([UNKNOWN]);

  const pos = editor.posAtCoords({ x: event.clientX, y: event.clientY });
  if (pos === null) return unhover();

  const { state: doc } = editor;
  const char = doc.sliceDoc(pos, pos + 1);
  const before = doc.sliceDoc(pos - 1, pos);
  if (char === `#` || (char === `.` && /[`'"]/.test(before))) {
    return hover([SELECTOR_MARKS[char]]);
  }

  const word = doc.wordAt(pos);
  const text = word && WORDS[doc.sliceDoc(word.from, word.to)];
  return text ? hover([text]) : unhover();
});
editor.dom.addEventListener(`mouseleave`, unhover);

// Другая раскладка — другой размер шрифта: редактор должен перемерить строки.
const setLayout = (layout) => {
  state.layout = layout;
  applyLayout(layout);
  render();
  editor.requestMeasure();
};

watchFrame((next) => {
  state.scale = next.scale;
  applyFrame(frame, next);
  editor.requestMeasure();
  refreshNotes();
});

// Ctrl+Enter работает, даже когда фокус не в терминале. В терминале его
// уже обработал CodeMirror и отменил действие по умолчанию.
addEventListener(`keydown`, (event) => {
  if (event.defaultPrevented || event.key !== `Enter`) return;
  if (!event.ctrlKey && !event.metaKey) return;

  event.preventDefault();
  run({ slow: event.shiftKey });
});

// Любая клавиша пропускает медленный показ. Сама клавиша работает как
// обычно: буква печатается. Ctrl+Enter не в счёт — запуск и так
// начинает показ заново.
const MODIFIERS = new Set([`Shift`, `Control`, `Alt`, `Meta`]);
addEventListener(
  `keydown`,
  (event) => {
    const running = event.key === `Enter` && (event.ctrlKey || event.metaKey);
    if (!MODIFIERS.has(event.key) && !running) replay.skip();
  },
  { capture: true },
);

// Рубильник — видимый двойник Ctrl+Enter.
const toScene = ({ clientX, clientY }) => {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((clientX - box.left) / box.width) * SCENE.width,
    y: ((clientY - box.top) / box.height) * SCENE.height,
  };
};

// Вещь под мышью: по её настоящей рамке из песочницы.
const thingAt = (point) =>
  Object.entries(state.world?.things ?? {}).find(
    ([, { present, rect }]) =>
      present &&
      rect.width > 0 &&
      isInside({ x: rect.x, y: rect.y, w: rect.width, h: rect.height }, point),
  );

canvas.addEventListener(`pointerdown`, (event) => {
  const point = toScene(event);

  const lever = isInside(state.layout.lever, point);
  const slow = isInside(state.layout.slow, point);
  if (lever || slow) {
    event.preventDefault();
    run({ slow });
    editor.focus();
    return;
  }

  // Ctrl+клик по вещи вставляет её селектор туда, где курсор, —
  // как «Copy selector» в DevTools. Табличка вещи вспыхивает.
  const found = (event.ctrlKey || event.metaKey) && thingAt(point);
  const selector = found && plateText(found[1]);
  if (!selector) return;

  event.preventDefault();
  editor.dispatch(editor.state.replaceSelection(`\`${selector}\``));
  editor.focus();
  const now = performance.now();
  state.flash = { keys: [found[0]], from: now, until: now + 400 };
});

// Щуп: навёл мышь на вещь — на полях её настоящий HTML, вещь обведена.
// На неё щуп не действует: её нет в DOM. Об этом — один раз.
const HER = `Её не ищи. Она не вещь.`;
let metHer = false;
let showingHer = false;

canvas.addEventListener(`pointermove`, (event) => {
  const point = toScene(event);
  const found = thingAt(point);
  const onSwitch =
    isInside(state.layout.lever, point) || isInside(state.layout.slow, point);
  state.probe = found?.[0] ?? null;
  canvas.style.cursor = onSwitch || found ? `pointer` : ``;

  if (found) {
    return hover([
      rawNote(found[1].tag),
      `Ctrl+клик — вставить её селектор в код.`,
    ]);
  }

  const her = girlBox(state.girl);
  if (her && isInside(her, point) && !metHer) {
    showingHer = true;
    return hover([HER]);
  }
  if (showingHer) {
    showingHer = false;
    metHer = true;
  }
  unhover();
});

canvas.addEventListener(`pointerleave`, () => {
  state.probe = null;
  unhover();
});

// Первая загрузка: комната и уже решённые файлы станции. Без них лампа
// не горит.
lastRun = state.solved ?? ``;
replay.start({ slow: false, dip: false, marked: null, file: TASK.file });
sandbox.run(state.solved ? [{ name: TASK.file, code: state.solved }] : []);

const shownote = document.querySelector(`#shownote`);
let last = performance.now();
const tick = (now) => {
  const lamp = state.world?.things.lamp;
  const lampOn = !!state.world?.room.present && hasClass(lamp, `on`);
  const before = state.girl.mode;

  replay.update(now);
  shownote.hidden = !replay.view.slow;
  updateGirl(state.girl, { lampOn }, Math.min(0.1, (now - last) / 1000));
  const left = before !== `gone` && state.girl.mode === `gone`;
  if (left && !state.solved) succeed();
  last = now;
  render(now);
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

if (import.meta.env.DEV) {
  const { installDevTools } = await import(`./dev/tools.js`);
  installDevTools({ state, render, setLayout, canvas, editor, sandbox });
}
