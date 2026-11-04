import { grey } from "../../render/palette.js";
import { dot } from "../../render/pixels.js";

// Ручка — настоящий <input type="color">. Шкала идёт от тёмного к светлому
// по одному холодному оттенку: поворот p 0…1 — светлота цвета. Стрелку
// рисует код по настоящему value: покрасил ручку кодом — стрелка встала
// на его светлоту.
const HUE = 212;
const SATURATION = 0.45;
const SWEEP = 135;

const hex = (value) =>
  Math.round(value * 255)
    .toString(16)
    .padStart(2, `0`);

// Поворот → цвет: HSL с заданной светлотой, как #rrggbb для value.
export const knobTurn = (p) => {
  const l = Math.min(1, Math.max(0, p));
  const a = SATURATION * Math.min(l, 1 - l);
  const channel = (n) => {
    const k = (n + HUE / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return `#${hex(channel(0))}${hex(channel(8))}${hex(channel(4))}`;
};

// Цвет → поворот: его светлота по HSL.
export const knobPosition = (value) => {
  const rgb = value?.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!rgb) return 0;
  const channels = rgb.slice(1).map((part) => parseInt(part, 16) / 255);
  return (Math.max(...channels) + Math.min(...channels)) / 2;
};

// Угол поворота мыши вокруг оси: 0 — вверх, по часовой — больше.
export const knobAt = ({ x, y }, center) => {
  const angle = (Math.atan2(x - center.x, center.y - y) * 180) / Math.PI;
  return (Math.max(-SWEEP, Math.min(SWEEP, angle)) + SWEEP) / (2 * SWEEP);
};

// Ручка: круглая головка и стрелка от оси к краю.
export const drawKnob = (ctx, { x, y, r }, value) => {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dy);
      if (d > r + 0.3) continue;
      const rim = d > r - 1 && dx + dy < 0;
      dot(ctx, rim ? grey[4] : grey[3], x + dx, y + dy);
    }
  }

  const angle = ((knobPosition(value) * 2 - 1) * SWEEP * Math.PI) / 180;
  for (let step = 1; step < r; step++) {
    dot(
      ctx,
      grey[0],
      Math.round(x + Math.sin(angle) * step),
      Math.round(y - Math.cos(angle) * step),
    );
  }
};
