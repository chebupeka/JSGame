import assert from "node:assert/strict";
import { test } from "node:test";

import { drawWire, wirePoints } from "../src/render/wires.js";

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

// Что горит на холсте: подделка контекста записывает точки.
const lit = (options) => {
  const dots = [];
  const ctx = { fillRect: (x, y) => dots.push(`${x},${y}`) };
  drawWire(ctx, [215, 112], [93, 71], options);
  return dots;
};

test(`пунктир ровный: 25 % — каждая четвёртая точка, 50 % — через одну`, () => {
  const all = wirePoints([215, 112], [93, 71]).map(([x, y]) => `${x},${y}`);
  const quarter = lit({ density: 0.25 });
  const half = lit({ density: 0.5 });

  const gaps = (dots) => {
    const at = dots.map((dot) => all.indexOf(dot));
    return new Set(at.slice(1).map((value, i) => value - at[i]));
  };
  assert.deepEqual(gaps(quarter), new Set([4]));
  assert.deepEqual(gaps(half), new Set([2]));
  assert.equal(lit({ density: 1 }).length, all.length);
});
