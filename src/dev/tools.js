import { LAYOUTS } from "../screen/layout.js";
import { SCENE } from "../screen/scale.js";
import { drawFloorMockup } from "./mockup.js";

// Клавиши разработчика, только в `npm run dev`:
//   Alt+Shift+L — крупный или компактный терминал;
//   Alt+Shift+M — макет пола;
//   Alt+Shift+P — сохранить кадр 320×180 в PNG (для check_palette.py).
const savePng = (canvas) => {
  canvas.toBlob((blob) => {
    const link = document.createElement(`a`);
    link.href = URL.createObjectURL(blob);
    link.download = `frame.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
};

const checkPixels = (canvas, state) => {
  new ResizeObserver(([entry]) => {
    const [{ inlineSize, blockSize }] = entry.devicePixelContentBoxSize;
    const expected = [SCENE.width * state.scale, SCENE.height * state.scale];

    if (inlineSize !== expected[0] || blockSize !== expected[1]) {
      console.warn(
        `Холст ${inlineSize}×${blockSize} физических пикселей, а нужно ${expected.join(`×`)}: пиксели сцены расплывутся.`,
      );
    }
  }).observe(canvas, { box: `device-pixel-content-box` });
};

export const installDevTools = ({
  state,
  render,
  setLayout,
  canvas,
  editor,
  sandbox,
}) => {
  checkPixels(canvas, state);

  // Для проверок из консоли DevTools: jsgame.state, jsgame.render(),
  // jsgame.query([`#lamp`]), jsgame.setCode(`…`).
  window.jsgame = {
    state,
    render,
    query: sandbox.query,
    setCode: (code) =>
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: code },
      }),
  };

  addEventListener(
    `keydown`,
    (event) => {
      if (!event.altKey || !event.shiftKey) return;

      const actions = {
        KeyL: () =>
          setLayout(
            state.layout === LAYOUTS.large ? LAYOUTS.compact : LAYOUTS.large,
          ),
        KeyM: () => {
          state.overlays = state.overlays.length ? [] : [drawFloorMockup];
          render();
        },
        KeyP: () => savePng(canvas),
      };

      if (!actions[event.code]) return;
      event.preventDefault();
      event.stopPropagation();
      actions[event.code]();
    },
    { capture: true },
  );
};
