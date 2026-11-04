import { blue, blueGlow, blueLight, grey } from "./palette.js";
import { dot, isLit } from "./pixels.js";

// Датчик-зажим ≈8×10 из маски (MECHANICS.md §3.2): сверху гнездо с лампой,
// снизу зажим, которым он держится за вещь. Он синий — его повесил код
// игрока. Плотность растра — смысл: 0.25 — задуман, пока печатаешь,
// 0.5 — защёлкнут и ждёт, 1 — сработал на событие.
//   s — гнездо, L — лампа, # — зажим.
const MASK = [
  `..ssss..`,
  `..sLLs..`,
  `...ss...`,
  `.######.`,
  `.#....#.`,
  `##....##`,
  `#......#`,
  `##....##`,
  `.#....#.`,
  `.######.`,
];

export const SENSOR = { w: 8, h: 10 };

// Рамка вещи под датчиком. Запись бывает 0×0 (песочница ещё без размера) —
// тогда берём рамку вещи из последнего снимка. null — рисовать негде.
export const sensorRect = ({ rect, key }, world) => {
  const found = rect?.width > 0 ? rect : world?.things[key]?.rect;
  return found?.width > 0 ? found : null;
};

// Где датчик на вещи: зажат на её верхней кромке, ближе к правому краю.
export const sensorSpot = ({ x, y, width }) => ({
  x: Math.round(x + width - SENSOR.w - 2),
  y: Math.max(0, Math.round(y - SENSOR.h + 3)),
});

// kind: `lit` — вещь шлёт это событие, лампа горит; `dark` — событие
// бывает, но эта вещь его не шлёт; `none` — такого события нет, гнезда нет.
// blink — лампа медленно мигает: датчик ждёт.
export const drawSensor = (ctx, spot, { kind, density, blink = true }) => {
  MASK.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      const px = spot.x + x;
      const py = spot.y + y;
      if (cell === `.`) return;
      if (kind === `none` && (cell === `s` || cell === `L`)) return;

      if (cell === `L`) {
        const color = kind === `lit` ? (blink ? blueLight : blueGlow) : grey[2];
        dot(ctx, color, px, py);
        return;
      }
      if (isLit(px, py, density)) dot(ctx, blue, px, py);
    });
  });
};

// Где у датчика выход кабеля к терминалу — снизу, по центру.
export const sensorPort = (spot) => [
  spot.x + SENSOR.w / 2,
  spot.y + SENSOR.h - 1,
];
