// Ограничитель вспышек (MECHANICS.md §8): свет вещи догоняет настоящий
// цвет не быстрее rate в секунду. Полный размах тьма → свет занимает
// не меньше 0,4 с, значит, крупных вспышек не больше трёх в секунду,
// даже если код перекрашивает окно на каждый щелчок ручки.
// «Меньше движения» в настройках делает свет ещё спокойнее.
export const GLOW_RATE = { normal: 2.5, calm: 1 };

// level — яркость из glassLevel, null — свет выключен (прозрачное стекло).
export const easeGlow = (shown, level, dt, rate) => {
  const from = shown ?? 0;
  const to = level ?? 0;
  const step = Math.sign(to - from) * Math.min(Math.abs(to - from), rate * dt);
  const next = from + step;
  return level === null && next <= 0.01 ? null : next;
};
