import { drawPlate, plateText } from "./stencil.js";

// Таблички вещей: настоящий id или класс. Горят, если к вещи тянется
// провод, и вспыхивают, когда её селектор вставили Ctrl+кликом или
// к ней добежал импульс поиска.
export const drawPlates = (ctx, things, { world, wires, flash, time }) => {
  things.forEach(({ key, plate }) => {
    const flashing =
      flash?.keys.includes(key) && time >= flash.from && time < flash.until;
    const lit = flashing || wires.some((wire) => wire.key === key);
    drawPlate(ctx, plate, plateText(world?.things[key]), lit);
  });
};
