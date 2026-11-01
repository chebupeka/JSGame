import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/400-italic.css";
import "./style.css";

import { drawScene } from "./render/scene.js";
import { LAYOUTS, applyLayout } from "./screen/layout.js";
import { applyFrame, watchFrame } from "./screen/scale.js";
import { createEditor } from "./terminal/editor.js";
import { showNotes } from "./terminal/notes.js";

const TASK = `// Хочу, чтобы в щитовой загорелась лампа.\n`;
const FILE = `lamp.js`;
const NOTE = `Темно. Лампа на стене — это элемент страницы, у неё есть имя. Запуск — Ctrl+Enter.`;

const frame = document.querySelector(`#frame`);
const canvas = document.querySelector(`#scene`);
const ctx = canvas.getContext(`2d`);

const state = { layout: LAYOUTS.large, scale: 4, overlays: [] };

const render = () => drawScene(ctx, state);

// Редактор меряет ширину знаков, поэтому ждёт, пока шрифт загрузится
// (и латиница, и кириллица).
await Promise.all([
  document.fonts.load(`1em "JetBrains Mono"`, `a=>Ж`),
  document.fonts.load(`italic 1em "JetBrains Mono"`, `aЖ`),
]);

document.querySelector(`#nameplate`).textContent = FILE;
applyLayout(state.layout);
render();
const editor = createEditor(document.querySelector(`#code`), TASK);

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

  // На ×3 и меньше код мельче 12 px: игра работает, но лучше крупнее.
  showNotes(...(next.scale < 4 ? [`Разверни окно или нажми F11.`] : []), NOTE);
});

if (import.meta.env.DEV) {
  const { installDevTools } = await import(`./dev/tools.js`);
  installDevTools({ state, render, setLayout, canvas, editor });
}
