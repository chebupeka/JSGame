import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/400-italic.css";
import "@fontsource/tiny5/400.css";
import "./style.css";

import { parse } from "acorn";

import { distance, explainError } from "./code/errors.js";
import { guardLoops, instrument } from "./code/instrument.js";
import { createLivePreview } from "./code/live.js";
import { findQueries } from "./code/preview.js";
import { createGirl, girlBox, resetGirl, updateGirl } from "./girl/girl.js";
import { loadProgress, saveProgress } from "./progress.js";
import { glassLevel } from "./render/glass.js";
import { GLOW_RATE, easeGlow } from "./render/glow.js";
import { drawScene } from "./render/scene.js";
import { SENSOR, sensorRect, sensorSpot } from "./render/sensor.js";
import { loadSprites } from "./render/sprites.js";
import { STENCIL_FONT, plateText } from "./render/stencil.js";
import { createSandbox } from "./sandbox/host.js";
import { LAYOUTS, applyLayout } from "./screen/layout.js";
import { SCENE, applyFrame, watchFrame } from "./screen/scale.js";
import { createSettingsPage, loadSettings } from "./settings.js";
import { createSound } from "./sound/station.js";
import {
  STATION,
  STATION_NAMES,
  STATION_THINGS,
  TASKS,
  viewOf,
} from "./station.js";
import {
  entryCode,
  filesFor,
  firstOpen,
  monitorsOf,
  nextOf,
} from "./tasks/chain.js";
import { createEditor } from "./terminal/editor.js";
import { formatCode } from "./terminal/format.js";
import { isInside } from "./terminal/lever.js";
import { setNotch } from "./terminal/marks.js";
import { errorNotes, rawNote, showNotes } from "./terminal/notes.js";
import { SELECTOR_MARKS, SIGNS, WORDS, signAt } from "./terminal/words.js";
import { createReplay } from "./trace/replay.js";

const SMALL = `Разверни окно или нажми F11.`;
const ALIGNED = `Prettier ничего не поменял. Значит, код уже выглядит так, как его отформатировал бы инструмент профи.`;
const UNREADABLE = `Prettier не смог прочитать этот код: в нём ошибка. Запусти — браузер скажет, где.`;
const HANG = `Код не закончился и за секунду. Похоже на бесконечный цикл. Станция перезапущена, можно запускать снова.`;
const HALT = `Цикл крутился без передышки дольше секунды, и сторож его прервал. Похоже на бесконечный цикл: станет ли его условие когда-нибудь ложным?`;
const UNKNOWN = `Узнаем при запуске. Заранее тут честно не сказать: селектор собирается на ходу, ищет не от document или код выше меняет страницу.`;

const frame = document.querySelector(`#frame`);
const canvas = document.querySelector(`#scene`);
const ctx = canvas.getContext(`2d`);

// Прогресс: решённые файлы работают на мониторах и в мире после F5,
// черновик не теряется. Открыта первая нерешённая задача.
const progress = loadProgress();
let task = firstOpen(TASKS, progress.tasks);
let place = task.place;

const state = {
  layout: LAYOUTS.large,
  scale: 4,
  overlays: [],
  world: null,
  place,
  girl: createGirl(place.path),
  // Переход в следующее место после успеха: тишина, затемнение, комната.
  transition: null,
  // Сглаженный свет стёкол: ограничитель вспышек.
  glow: {},
  lever: { closed: false, bounced: null },
  breaker: { tripped: false },
  // Когда песочница перестала отвечать (мир застыл) и когда клацнул сторож.
  stalled: null,
  watchdog: 0,
  dim: 0,
  // null — пометка при входе в задачу; иначе — то, что случилось (ошибка).
  notes: null,
  hint: 0,
  wires: [],
  // Призрачные датчики, пока печатаешь (превью).
  ghosts: [],
  // Решена ли открытая задача и код на мониторах этого места.
  solved: false,
  monitors: [],
};

const render = (time = performance.now()) => drawScene(ctx, state, time);

// Пометка при входе в задачу и последняя открытая подсказка.
const entryNotes = () => [
  ...task.notes,
  ...task.hints.slice(0, state.hint).slice(-1),
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
  if (hurry()) return;
  state.hint = Math.min(task.hints.length, state.hint + 1);
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
  const broken = isSyntax(error) ? syntaxPlace(lastRun) : null;
  const located = broken ? { ...error, ...broken } : error;
  const typed = findQueries(lastRun)
    .filter(({ status }) => status === `check`)
    .map(({ selector }) => selector);
  const explained = explainError(located, {
    code: lastRun,
    typed,
    ...STATION_NAMES,
  });

  // Опечатка в селекторе: табличка похожей вещи тихо мерцает несколько
  // секунд — вот что на ней выбито на самом деле.
  const lookalike = place.things.find(({ key, plateClass }) => {
    const text = plateText(state.world?.things[key], plateClass);
    return (
      text && typed.some((word) => word !== text && distance(word, text) <= 2)
    );
  });
  if (lookalike) {
    state.flicker = {
      key: lookalike.key,
      until: performance.now() + 4000,
    };
  }

  state.notes = errorNotes(explained, () => {
    editor.dispatch({
      selection: { anchor: positionOf(located) },
      scrollIntoView: true,
    });
    editor.focus();
  });
  if (broken) editor.dispatch({ effects: setNotch.of(positionOf(broken)) });
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
    sound.play(`bounce`);
  } else {
    state.breaker.tripped = true;
    sound.play(`breaker`);
  }
  showError(error);
};

// Звук станции и подписи к нему на кромке корпуса (решение 4: всё, что
// слышно, видно и так). Звук начинается с первой клавиши или щелчка.
const settings = loadSettings();
const caption = document.querySelector(`#caption`);
let captionTimer = null;
const sound = createSound({
  settings,
  onCaption: (text) => {
    caption.textContent = text;
    clearTimeout(captionTimer);
    captionTimer = setTimeout(() => {
      caption.textContent = ``;
    }, 2000);
  },
});
addEventListener(`keydown`, sound.start, { capture: true, once: true });
addEventListener(`pointerdown`, sound.start, { capture: true, once: true });

// Сторона комнаты для звука: левый край сцены — левое ухо.
const panOf = (rect) =>
  rect ? ((rect.x + rect.width / 2) / SCENE.width) * 2 - 1 : 0.2;

// Когда последний раз трещал повторный поиск: от этого зависит море.
let lastCrackle = -Infinity;

// Показ по шагам: всё, что пришло из песочницы, идёт через него — мир
// меняется, ошибка появляется ровно тогда, когда показ до неё дошёл.
const replay = createReplay({
  onWorld: (world) => {
    if (!settling) state.world = world;
  },
  onError: fail,
  onFlash: (keys, from, until) => {
    state.flash = { keys, from, until };
  },
  onSlowShown: () => {
    progress.shown[task.id] = true;
    saveProgress(progress);
  },
  onPulse: (rect) => sound.play(`pulse`, { pan: panOf(rect) }),
  onSound: (id, rect) => {
    if (id === `crackle`) lastCrackle = performance.now();
    sound.play(id, { pan: panOf(rect) });
  },
  // Ошибка внутри обработчика выбивает только эту ветку: автомат цел,
  // датчик слушает дальше. На полях — тот же разбор, что и всегда.
  onFault: (fault) => showError(unmark(fault)),
  // Запуск повесил датчик и ничего не сломал — а окно не изменилось.
  // Так и задумано: об этом один раз за задачу.
  onFinish: () => {
    if (!replay.view.sensors.size || state.notes || !task.waiting) return;
    if (progress.waited[task.id]) return;
    progress.waited[task.id] = true;
    saveProgress(progress);
    state.notes = [task.waiting];
    refreshNotes();
  },
  onHalt: () => {
    state.notes = [HALT];
    refreshNotes();
  },
});

// Сторож (MECHANICS.md §3.3): пока код занят, мир застывает, свет тускнеет
// и гул ползёт вверх. Через секунду клац сторожа, свет на миг гаснет —
// и снова слышно море.
const watchdog = () => {
  state.stalled = null;
  state.watchdog = performance.now();
  sound.play(`watchdog`);
};

const dimAt = (now) => {
  const strain = state.stalled === null ? 0 : (now - state.stalled) / 1000;
  const clack = state.watchdog ? 1 - (now - state.watchdog) / 500 : 0;
  return Math.max(0, Math.min(0.45, strain * 0.45), clack * 0.9);
};
state.trace = replay.view;

// Разметка последнего запуска: столбцы ошибок и мест вызова в размеченном
// коде правее твоих, map() возвращает их назад.
let marked = null;
// Её проверка открытой задачи: как она пробует код и куда идёт потом.
let scenario = null;
// Открыли задачу: решённые файлы заново поднимают мир. Пока они не
// закончат, на экране прежний снимок — иначе свет мигнул бы.
let settling = false;
let settled = null;
const unmark = (place) =>
  marked && place.file === task.file && place.column
    ? { ...place, column: marked.map(place.line, place.column) }
    : place;

// Файлы станции: решённые работают и без запуска, каждый со сторожем
// циклов, но без меток показа. Метки есть только в твоём коде этого запуска.
const stationFiles = (current = null) =>
  filesFor(TASKS, task, progress.files, current).map(({ name, code }) => ({
    name,
    code: current !== null && name === task.file ? code : guardLoops(code),
  }));

// Ошибка или сторож в решённом файле прошлой комнаты — не про задачу
// на экране: автомат её не выбивает, на полях о ней ни слова. Сторож
// в обработчике файла не знает (null) — он про код, который на экране.
const mine = ({ file }) => !file || file === task.file;

const sandbox = createSandbox({
  worldContainer: document.querySelector(`#sandbox`),
  previewContainer: document.querySelector(`#preview`),
  room: STATION,
  things: STATION_THINGS,
  // В превью — без файла, который сейчас правится: он ещё не запущен.
  solvedFiles: () => stationFiles().filter(({ name }) => name !== task.file),
  view: () => viewOf(place),
  onSnapshot: (world) => {
    settled = world;
    replay.receive({ kind: `world`, world });
  },
  onTrace: (event) => replay.receive(event),
  onError: (error) => {
    if (mine(error)) replay.receive({ kind: `error`, error: unmark(error) });
  },
  onDone: () => {
    if (settling) {
      settling = false;
      state.world = settled;
    }
    replay.receive({ kind: `done` });
  },
  onStall: (busy) => {
    state.stalled = busy ? performance.now() : null;
    if (busy) sound.play(`strain`);
  },
  onHalt: (file) => {
    watchdog();
    if (mine({ file })) replay.receive({ kind: `halt` });
  },
  onHang: () => {
    watchdog();
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
  document.fonts.load(STENCIL_FONT, `аЯ`),
]);
state.sprites = sprites;
ctx.imageSmoothingEnabled = false;

// Запуск — как перезагрузка питания: чистая страница, затем твой код.
// Первый запуск задачи показывается медленно, и свет проседает.
const run = ({ slow = false } = {}) => {
  state.lever.closed = true;
  state.lever.bounced = null;
  state.breaker.tripped = false;
  state.world = null;
  state.notes = null;
  state.flicker = null;
  state.later = null;
  settling = false;
  scenario.run();
  refreshNotes();
  lastRun = editor.state.doc.toString();
  marked = instrument(lastRun);
  editor.dispatch({ effects: setNotch.of(null) });

  const first = !progress.shown[task.id];
  replay.start({ slow: slow || first, dip: first, marked, file: task.file });
  sandbox.run(stationFiles(marked.code));
  sound.play(`lever`);
  sound.play(`rise`);
};

// Успех ничем не объявляется (MECHANICS.md §3.4): она сделала своё, файл
// уезжает на монитор и работает там дальше. Несколько секунд игра ничего
// не предлагает — можно просто смотреть. Потом честная пометка, если есть
// что сказать (был шум — откуда он; его нет — чем это лучше и чем не лучше;
// переделывать не обязательно), и следующая задача.
const QUIET = 4000;
const NOTE_AT = 1500;
const readingTime = (notes) =>
  3000 + 50 * notes.reduce((sum, { length }) => sum + length, 0);

const succeed = () => {
  scenario.solve();
  state.solved = true;
  progress.tasks[task.id] = true;
  progress.files[task.file] = lastRun;
  delete progress.drafts[task.id];
  saveProgress(progress);
  state.monitors = monitorsOf(place.tasks, progress.files);
  state.notes = [];
  refreshNotes();

  const now = performance.now();
  const notes = task.after?.({ finds: replay.view.finds, code: lastRun });
  if (notes) state.later = { at: now + NOTE_AT, notes };

  const next = nextOf(TASKS, task);
  if (next) {
    const pause = notes ? NOTE_AT + readingTime(notes) : QUIET;
    state.transition = { start: now, pause, next, fade: next.place !== place };
  }
};

// Клавиша или щелчок по полям во время паузы: хватит смотреть, дальше.
const hurry = () => {
  const { transition } = state;
  if (!transition || transition.entered) return false;
  transition.pause = Math.min(
    transition.pause,
    performance.now() - transition.start,
  );
  return true;
};

let saveDraft = null;
const keepDraft = () => {
  clearTimeout(saveDraft);
  saveDraft = setTimeout(() => {
    if (!state.solved) progress.drafts[task.id] = editor.state.doc.toString();
    saveProgress(progress);
  }, 500);
};

const nameplate = document.querySelector(`#nameplate`);
nameplate.textContent = task.file;
applyLayout(state.layout);
let live = null;
const { view: editor, load: loadCode } = createEditor(
  document.querySelector(`#code`),
  ``,
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
  onSensors: (ghosts) => {
    state.ghosts = ghosts;
  },
  onWires: (wires) => {
    // Новое совпадение — щелчок реле с той стороны, где вещь.
    const before = new Set(state.wires.map(({ key }) => key));
    const fresh = wires.find(({ key }) => key && !before.has(key));
    if (fresh) sound.play(`relay`, { pan: panOf(fresh.target) });
    state.wires = wires;
  },
});
live.schedule();

// Мягкие клавиши, пока печатаешь в терминале.
const TYPING = new Set([`Backspace`, `Delete`, `Enter`, `Tab`]);
editor.dom.addEventListener(`keydown`, (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.length === 1 || TYPING.has(event.key)) sound.play(`key`);
});

// Esc: первый выводит фокус из терминала (Tab там — отступ, и без Esc
// из него не выйти), второй открывает настройки, третий закрывает.
const settingsPage = createSettingsPage(
  document.querySelector(`#settings`),
  settings,
  sound.apply,
);
addEventListener(`keydown`, (event) => {
  if (event.key !== `Escape`) return;
  if (settingsPage.isOpen) {
    settingsPage.close();
    editor.focus();
  } else if (editor.hasFocus) {
    editor.contentDOM.blur();
  } else {
    settingsPage.open();
  }
});

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

  const line = doc.doc.lineAt(pos);
  const sign = signAt(line.text, pos - line.from);
  const word = doc.wordAt(pos);
  const help = sign
    ? SIGNS[sign]
    : word && Object.hasOwn(WORDS, doc.sliceDoc(word.from, word.to))
      ? WORDS[doc.sliceDoc(word.from, word.to)]
      : null;
  return help ? hover([help.text, rawNote(`MDN: ${help.mdn}`)]) : unhover();
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

// Shift+Alt+F и тумблер «выровнять»: Prettier раскладывает код как у профи.
// Клавишу ловим по её месту на клавиатуре, а не по букве, поэтому она
// работает и в русской раскладке. Правка одна — Ctrl+Z возвращает всё.
const align = async () => {
  state.aligned = performance.now() + 300;
  const source = editor.state.doc.toString();
  const { head } = editor.state.selection.main;
  const { code, cursorOffset, changed, broken } = await formatCode(
    source,
    head,
  );
  // Пока грузился Prettier, код могли поменять: тогда не трогаем.
  if (editor.state.doc.toString() !== source) return;

  if (changed) {
    editor.dispatch({
      changes: { from: 0, to: source.length, insert: code },
      selection: { anchor: cursorOffset },
    });
  }
  // Что вышло, говорят поля. Лесенка из длинной строки — честная пометка.
  const wasLong = source.split(`\n`).some((line) => line.length > 60);
  if (broken) state.notes = [UNREADABLE];
  else if (!changed) state.notes = [ALIGNED];
  else if (wasLong && task.ladder) state.notes = [task.ladder];
  else return editor.focus();
  refreshNotes();
  editor.focus();
};

addEventListener(
  `keydown`,
  (event) => {
    if (event.code !== `KeyF` || !event.altKey || !event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    align();
  },
  { capture: true },
);

// Любая клавиша пропускает медленный показ. Сама клавиша работает как
// обычно: буква печатается. Ctrl+Enter не в счёт — запуск и так
// начинает показ заново.
const MODIFIERS = new Set([`Shift`, `Control`, `Alt`, `Meta`]);
addEventListener(
  `keydown`,
  (event) => {
    const running = event.key === `Enter` && (event.ctrlKey || event.metaKey);
    if (MODIFIERS.has(event.key) || running) return;
    replay.skip();
    // Пауза после успеха: клавиша ведёт дальше, в решённый файл не печатает.
    if (hurry()) event.preventDefault();
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

  if (isInside(state.layout.align, point)) {
    event.preventDefault();
    align();
    return;
  }

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
  const found = thingAt(point);
  const manifest = place.things.find(({ key }) => key === found?.[0]);
  const selector =
    (event.ctrlKey || event.metaKey) &&
    plateText(found?.[1], manifest?.plateClass);
  if (selector) {
    event.preventDefault();
    editor.dispatch(editor.state.replaceSelection(`\`${selector}\``));
    editor.focus();
    const now = performance.now();
    state.flash = { keys: [found[0]], from: now, until: now + 400 };
    return;
  }

  // Ручку можно крутить и самому, мышью.
  if (place.knob && found?.[0] === place.knob.key) {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    turning = { value: null, sent: 0 };
    turnTo(point);
  }
});

// Поворот ручки — настоящее значение и настоящее событие input, как от
// руки; отпустил — change. Не чаще раза в кадр: каждое событие — снимок.
let turning = null;
const turnTo = (point, force = false) => {
  const { at, turn, center } = place.knob;
  const value = turn(at(point, center));
  const now = performance.now();
  if (value === turning.value || (!force && now - turning.sent < 16)) return;

  turning.value = value;
  turning.sent = now;
  turnKnob(value, `input`);
};

canvas.addEventListener(`pointerup`, (event) => {
  if (!turning) return;
  turnTo(toScene(event), true);
  turnKnob(undefined, `change`);
  turning = null;
});

// Щуп: навёл мышь на вещь — на полях её настоящий HTML, вещь обведена.
// На неё щуп не действует: её нет в DOM. Об этом — один раз.
const HER = `Её не ищи. Она не вещь.`;

const sensorAt = (point) =>
  [...replay.view.sensors.values()].find((sensor) => {
    const rect = sensorRect(sensor, state.world);
    if (!rect) return false;
    const { x, y } = sensorSpot(rect);
    return isInside({ x, y, w: SENSOR.w, h: SENSOR.h }, point);
  });
let metHer = false;
let showingHer = false;

canvas.addEventListener(`pointermove`, (event) => {
  const point = toScene(event);
  if (turning) return turnTo(point);
  const found = thingAt(point);
  const onSwitch =
    isInside(state.layout.lever, point) ||
    isInside(state.layout.slow, point) ||
    isInside(state.layout.align, point);
  state.probe = found?.[0] ?? null;
  canvas.style.cursor = onSwitch || found ? `pointer` : ``;

  // Щуп на датчике: что он слушает и что пришло с последним событием.
  const sensor = sensorAt(point);
  if (sensor) {
    return hover([
      `Датчик слушает событие ${sensor.type}.`,
      ...(sensor.value === undefined
        ? []
        : [rawNote(`evt.target.value: ${JSON.stringify(sensor.value)}`)]),
    ]);
  }

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

// Рука на ручке — её или твоя: настоящее значение и настоящее событие.
// Щелчки ручки — не чаще, чем слышно.
let lastClick = 0;
const turnKnob = (value, event) => {
  sandbox.act({ key: place.knob.key, value, event });
  const now = performance.now();
  if (now - lastClick < 70) return;
  lastClick = now;
  sound.play(`knob`, { pan: panOf(state.world?.things[place.knob.key]?.rect) });
};

// Чем кончилась её проверка. Разбор ошибки на полях не перебиваем.
const SILENT = `Самые неприятные ошибки — молчаливые. Проверь щупом, что на самом деле пришло.`;
const outcome = (kind, note = null) => {
  // «Пока ничего. Так и надо» было про время до её пробы: теперь она
  // попробовала, и это уже неправда. Разбор ошибки остаётся.
  const waiting = state.notes?.[0] === task.waiting;
  if (state.notes && !waiting) return;

  state.notes = null;
  if (kind === `almost` && (note ?? task.almost)) {
    state.notes = [note ?? task.almost];
  } else if (kind === `silent` && !progress.waited.silent) {
    progress.waited.silent = true;
    saveProgress(progress);
    state.notes = [SILENT];
  }
  refreshNotes();
};

// Открыть задачу: её файл в терминале, она там, где закончила прошлую,
// станция поднята решёнными файлами. Задача уже решена (F5 после конца) —
// она стоит там, куда ушла, в терминале решённый код.
const open = (next) => {
  const moved = next.place !== place || !scenario;
  clearTimeout(saveDraft);
  task = next;
  place = next.place;
  state.place = place;
  state.solved = !!progress.tasks[task.id];
  state.monitors = monitorsOf(place.tasks, progress.files);
  state.wires = [];
  state.ghosts = [];
  state.later = null;
  state.hint = 0;
  state.notes = state.solved ? [] : null;
  state.lever.closed = false;
  state.breaker.tripped = false;
  state.flicker = null;
  if (moved) {
    state.world = null;
    state.glow = {};
    resetGirl(state.girl, place.path);
  }

  nameplate.textContent = task.file;
  lastRun = state.solved ? progress.files[task.file] : ``;
  loadCode(
    state.solved
      ? lastRun
      : (progress.drafts[task.id] ?? entryCode(task, progress.files)),
  );
  refreshNotes();
  live.schedule();

  marked = null;
  sandbox.refresh();
  settling = true;
  replay.start({ slow: false, dip: false, marked: null, file: task.file });
  sandbox.run(stationFiles());
  scenario = task.check({
    girl: state.girl,
    turnKnob,
    onOutcome: outcome,
  });
  scenario.enter(state.solved);
  editor.focus();
};

// Переход после успеха: несколько секунд ничего не происходит. Дальше та
// же комната — просто следующий файл в терминале. Другое место — комната
// темнеет, и вот уже другое место: прошло время.
const FADE = 800;
const transitionDim = (now) => {
  const { start, pause, next, fade } = state.transition;
  const t = now - start - pause;
  if (t < 0) return 0;
  if (!fade) {
    state.transition = null;
    open(next);
    return 0;
  }
  if (t < FADE) return t / FADE;
  if (!state.transition.entered) {
    state.transition.entered = true;
    open(next);
  }
  if (t < 2 * FADE) return 2 - t / FADE;
  state.transition = null;
  return 0;
};

open(task);

const shownote = document.querySelector(`#shownote`);
let last = performance.now();
const step = (now) => {
  const wasDone = scenario.finished();
  // Код занят — мир застыл: она посреди шага, импульсы на месте.
  const frozen = state.stalled !== null;

  if (!frozen) {
    const dt = Math.min(0.1, (now - last) / 1000);
    replay.update(now);
    scenario.update({
      dt,
      world: state.world,
      sensors: replay.view.sensors,
      showDone: replay.view.finished,
      failed: state.breaker.tripped || !state.lever.closed,
      code: lastRun,
    });
    updateGirl(state.girl, dt);
    const rate = settings.calm ? GLOW_RATE.calm : GLOW_RATE.normal;
    (place.glows ?? []).forEach((key) => {
      const thing = state.world?.things[key];
      const level = thing?.present ? glassLevel(thing.background) : null;
      state.glow[key] = easeGlow(state.glow[key], level, dt, rate);
    });
  }
  state.calm = settings.calm;
  shownote.hidden = !replay.view.slow;
  if (!wasDone && scenario.finished()) succeed();
  if (state.later && now >= state.later.at) {
    state.notes = state.later.notes;
    state.later = null;
    refreshNotes();
  }
  // Тише шум — громче море: треск слышен, пока поиск правда повторяется.
  sound.hush(now - lastCrackle < 1500);
  last = now;
  state.dim = Math.max(dimAt(now), state.transition ? transitionDim(now) : 0);
  render(frozen ? state.stalled : now);
};
const tick = (now) => {
  step(now);
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

if (import.meta.env.DEV) {
  const { installDevTools } = await import(`./dev/tools.js`);
  installDevTools({
    state,
    render,
    setLayout,
    canvas,
    editor,
    sandbox,
    step,
    run,
    hurry,
    openTask: () => task,
    goto: (id) =>
      open(TASKS.find((each) => each.id === id || each.place.key === id)),
  });
}
