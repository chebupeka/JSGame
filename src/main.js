import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/400-italic.css";
import "@fontsource/tiny5/400.css";
import "./style.css";

import { createLivePreview } from "./code/live.js";
import { createGirl, resetGirl, updateGirl } from "./girl/stub.js";
import { drawScene } from "./render/scene.js";
import { loadSprites } from "./render/sprites.js";
import { STENCIL_FONT } from "./render/stencil.js";
import {
  SWITCHBOARD_ROOM,
  SWITCHBOARD_THINGS,
} from "./rooms/switchboard/manifest.js";
import { hasClass } from "./rooms/switchboard/things.js";
import { createSandbox } from "./sandbox/host.js";
import { LAYOUTS, applyLayout } from "./screen/layout.js";
import { SCENE, applyFrame, watchFrame } from "./screen/scale.js";
import { createEditor } from "./terminal/editor.js";
import { isInside } from "./terminal/lever.js";
import { showNotes } from "./terminal/notes.js";

const TASK = `// Хочу, чтобы в щитовой загорелась лампа.\n`;
const FILE = `lamp.js`;
const NOTE = `Темно. Лампа на стене — это элемент страницы, у неё есть имя. Запуск — Ctrl+Enter или рубильник.`;
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
  lever: { closed: false },
  notes: [NOTE],
  wires: [],
};

const render = (time = performance.now()) => drawScene(ctx, state, time);

// На ×3 и меньше код мельче 12 px: игра работает, но лучше крупнее.
const refreshNotes = () =>
  showNotes(...(state.scale < 4 ? [SMALL] : []), ...state.notes);

const sandbox = createSandbox({
  worldContainer: document.querySelector(`#sandbox`),
  previewContainer: document.querySelector(`#preview`),
  room: SWITCHBOARD_ROOM,
  things: SWITCHBOARD_THINGS,
  // Решённые файлы станции: в главе 1 их ещё нет.
  solvedFiles: () => [],
  onSnapshot: (world) => {
    state.world = world;
  },
  // Пока без разбора по частям (этап 8): дословный текст браузера и строка.
  onError: ({ text, line }) => {
    state.notes = [text, ...(line ? [`строка ${line}`] : [])];
    refreshNotes();
  },
  onHang: () => {
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

// Запуск — как перезагрузка питания: чистая страница, затем твой код.
// Она снова стоит в полосе света и ждёт, что получится.
const run = () => {
  state.lever.closed = true;
  state.world = null;
  state.notes = [NOTE];
  resetGirl(state.girl);
  refreshNotes();
  sandbox.run([{ name: FILE, code: editor.state.doc.toString() }]);
};

document.querySelector(`#nameplate`).textContent = FILE;
applyLayout(state.layout);
let live = null;
const editor = createEditor(document.querySelector(`#code`), TASK, {
  onRun: run,
  onChange: (update) => live.onChange(update),
});

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

// Наведи мышь на пунктир — на полях объяснение, почему «узнаем при запуске».
editor.dom.addEventListener(`mouseover`, ({ target }) => {
  if (target.closest(`.cm-unknown`)) showNotes(UNKNOWN);
});
editor.dom.addEventListener(`mouseout`, ({ target }) => {
  if (target.closest(`.cm-unknown`)) refreshNotes();
});

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
  run();
});

// Рубильник — видимый двойник Ctrl+Enter.
const toScene = ({ clientX, clientY }) => {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((clientX - box.left) / box.width) * SCENE.width,
    y: ((clientY - box.top) / box.height) * SCENE.height,
  };
};

canvas.addEventListener(`pointerdown`, (event) => {
  if (!isInside(state.layout.lever, toScene(event))) return;

  event.preventDefault();
  run();
  editor.focus();
});

canvas.addEventListener(`pointermove`, (event) => {
  canvas.style.cursor = isInside(state.layout.lever, toScene(event))
    ? `pointer`
    : ``;
});

// Первая загрузка: комната без кода игрока, лампа не горит.
sandbox.run([]);

let last = performance.now();
const tick = (now) => {
  const lamp = state.world?.things.lamp;
  const lampOn = !!state.world?.room.present && hasClass(lamp, `on`);

  updateGirl(state.girl, { lampOn }, Math.min(0.1, (now - last) / 1000));
  last = now;
  render(now);
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

if (import.meta.env.DEV) {
  const { installDevTools } = await import(`./dev/tools.js`);
  installDevTools({ state, render, setLayout, canvas, editor, sandbox });
}
