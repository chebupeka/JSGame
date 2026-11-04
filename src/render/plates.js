import { drawPlate, plateText } from "./stencil.js";

// Таблички вещей: настоящий id или класс. Горят, если вещь находит
// набранный селектор или её держит переменная после запуска, и вспыхивают,
// когда её селектор вставили Ctrl+кликом или её нашёл поиск в показе.
export const drawPlates = (
  ctx,
  things,
  { world, wires, held, flash, time },
) => {
  things.forEach(({ key, plate }) => {
    const flashing =
      flash?.keys.includes(key) && time >= flash.from && time < flash.until;
    const lit =
      flashing || held?.has(key) || wires.some((wire) => wire.key === key);
    drawPlate(ctx, plate, plateText(world?.things[key]), lit);
  });
};
