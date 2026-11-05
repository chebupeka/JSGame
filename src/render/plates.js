import { drawPlate, plateText } from "./stencil.js";

// Таблички вещей: настоящий id или класс. Горят, если вещь находит
// набранный селектор или её держит переменная после запуска, и вспыхивают,
// когда её селектор вставили Ctrl+кликом или её нашёл поиск в показе.
// Селектор с опечаткой — табличка похожей вещи тихо мерцает: вот что на
// ней выбито на самом деле.
export const drawPlates = (
  ctx,
  things,
  { world, wires, held, flash, flicker, time },
) => {
  things.forEach(({ key, plate }) => {
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
    drawPlate(ctx, plate, plateText(world?.things[key]), lit);
  });
};
