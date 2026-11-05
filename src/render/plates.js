import { blueLight } from "./palette.js";
import { rect } from "./pixels.js";
import { drawPlate, plateText } from "./stencil.js";

// Таблички вещей: настоящий id или класс. Горят, если вещь находит
// набранный селектор или её держит переменная после запуска, и вспыхивают,
// когда её селектор вставили Ctrl+кликом или её нашёл поиск в показе.
// Селектор с опечаткой — табличка похожей вещи тихо мерцает: вот что на
// ней выбито на самом деле.
const drawFrame = (ctx, { x, y, width, height }) => {
  rect(ctx, blueLight, x - 1, y - 1, width + 2, 1);
  rect(ctx, blueLight, x - 1, y + height, width + 2, 1);
  rect(ctx, blueLight, x - 1, y, 1, height);
  rect(ctx, blueLight, x + width, y, 1, height);
};

export const drawPlates = (
  ctx,
  things,
  { world, wires, held, flash, flicker, time },
) => {
  things.forEach(({ key, plate, plateClass }) => {
    const flashing =
      flash?.keys.includes(key) && time >= flash.from && time < flash.until;
    const flickering =
      flicker?.key === key &&
      time < flicker.until &&
      Math.floor(time / 300) % 2 === 0;
    const lit =
      flashing ||
      flickering ||
      held?.has(key) ||
      wires.some((wire) => (wire.keys ?? [wire.key]).includes(key));
    const thing = world?.things[key];
    // Табличка прямо на пустом табло. Появился текст — табличку закрыл он,
    // а горит теперь рамка самого табло.
    if (plate.onThing && thing?.text) {
      if (lit) drawFrame(ctx, thing.rect);
      return;
    }
    drawPlate(ctx, plate, plateText(thing, plateClass), lit);
  });
};
