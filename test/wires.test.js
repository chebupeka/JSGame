import assert from "node:assert/strict";
import { test } from "node:test";

import { grey } from "../src/render/palette.js";
import { WIRE, drawWire, wirePoints } from "../src/render/wires.js";

// Провод — ровная линия в один пиксель: без разрывов и без «уголков»,
// которые делают его местами толще.
const CASES = [
  [
    [215, 112],
    [240, 56],
  ],
  [
    [215, 112],
    [93, 71],
  ],
  [
    [215, 112],
    [312, 46],
  ],
  [
    [180, 125],
    [60, 40],
  ],
  [
    [215, 112],
    [191, 58],
  ],
];

test(`провод без разрывов и начинается у гнезда`, () => {
  for (const [from, to] of CASES) {
    const points = wirePoints(from, to);
    assert.deepEqual(points[0], from);
    points.slice(1).forEach(([x, y], i) => {
      const [px, py] = points[i];
      assert.ok(
        Math.abs(x - px) <= 1 && Math.abs(y - py) <= 1,
        `разрыв у ${x},${y}`,
      );
    });
  }
});

test(`провод в один пиксель: на изгибах нет уголков`, () => {
  for (const [from, to] of CASES) {
    const points = wirePoints(from, to);
    for (let i = 2; i < points.length; i++) {
      const [a, b, c] = [points[i - 2], points[i - 1], points[i]];
      const corner =
        (a[0] === b[0] || a[1] === b[1]) &&
        (b[0] === c[0] || b[1] === c[1]) &&
        a[0] !== c[0] &&
        a[1] !== c[1];
      assert.ok(!corner, `уголок у ${b}`);
    }
  }
});

// Что легло на холст: подделка контекста записывает точки и их цвет.
const paint = (options) => {
  const dots = new Map();
  const ctx = {
    fillStyle: null,
    fillRect(x, y) {
      dots.set(`${x},${y}`, this.fillStyle);
    },
  };
  drawWire(ctx, [215, 112], [93, 71], options);
  return dots;
};

const line = wirePoints([215, 112], [93, 71]).map(([x, y]) => `${x},${y}`);

test(`провод сплошной, цвет — смысл: задумано, ждёт, ток`, () => {
  for (const tone of [`ghost`, `wait`, `live`]) {
    const dots = paint({ tone });
    assert.ok(
      line.every((at) => dots.get(at) === WIRE[tone]),
      `${tone}: все точки линии его цвета`,
    );
  }
  assert.notEqual(WIRE.ghost, WIRE.wait);
  assert.notEqual(WIRE.wait, WIRE.live);
});

test(`под проводом тень, поверх провода — никогда`, () => {
  const dots = paint({ tone: `wait` });
  const shadows = [...dots].filter(([at]) => !line.includes(at));
  assert.ok(shadows.length > 0);
  assert.ok(shadows.every(([, color]) => color === grey[0]));
});

test(`прерывистый провод — длинные штрихи, погасший — не рисуется`, () => {
  const dashed = paint({ tone: `ghost`, dashed: true });
  const onLine = line.filter((at) => dashed.get(at) === WIRE.ghost);
  assert.ok(onLine.length > line.length / 2 && onLine.length < line.length);
  assert.equal(paint({ tone: null }).size, 0);
});
