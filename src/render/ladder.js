import { colors } from "./palette.js";
import { isLit } from "./pixels.js";

// Лесенка яркости: любой цвет из CSS сводится к палитре станции по яркости.
// Оттенок теряется, яркость остаётся: у `red` и `gray` она почти одна
// (0,213 и 0,216), поэтому и узор у них одинаковый. Между соседними
// ступенями — растр Байера 4×4.
const toLinear = (channel) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

export const luminance = ([r, g, b]) =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

export const parseHex = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Вычисленный цвет из песочницы: `rgb(87, 154, 243)` или `rgba(…)`.
export const parseRgb = (css) =>
  css
    .match(/\d+(\.\d+)?/g)
    .slice(0, 3)
    .map(Number);

const STEPS = colors
  .map((hex) => ({ hex, y: luminance(parseHex(hex)) }))
  .sort((a, b) => a.y - b.y);

// Две соседние ступени вокруг яркости y и доля верхней.
export const ladder = (y) => {
  const above = STEPS.findIndex((step) => step.y > y);
  if (above === 0) return { low: STEPS[0].hex, high: STEPS[0].hex, share: 0 };
  if (above === -1) {
    const top = STEPS.at(-1).hex;
    return { low: top, high: top, share: 0 };
  }

  const low = STEPS[above - 1];
  const high = STEPS[above];
  return {
    low: low.hex,
    high: high.hex,
    share: (y - low.y) / (high.y - low.y),
  };
};

// Цвет точки (x, y) сцены для яркости lum.
export const pickColor = (lum, x, y) => {
  const { low, high, share } = ladder(lum);
  return isLit(x, y, share) ? high : low;
};
