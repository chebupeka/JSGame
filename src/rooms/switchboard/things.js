export const hasClass = (thing, name) =>
  thing?.present ? thing.className.split(/\s+/).includes(name) : false;

// Лампа — спрайт от Codex, два кадра одним листом: выключена | горит.
// Место и размер — из настоящей вёрстки в песочнице, кадр — из класса `on`.
const drawLamp = (ctx, lamp, sheet) => {
  if (!lamp?.present || !sheet) return;

  const { x, y, width, height } = lamp.rect;
  // Рамка 0×0 — лампу спрятали (`display: none`) или песочница ещё
  // не получила размер: рисовать нечего.
  if (width < 1 || height < 1) return;

  const frame = hasClass(lamp, `on`) ? 1 : 0;
  ctx.drawImage(
    sheet,
    frame * 14,
    0,
    14,
    20,
    Math.round(x),
    Math.round(y),
    14,
    20,
  );
};

export const drawSwitchboardThings = (ctx, things, sprites) => {
  drawLamp(ctx, things?.lamp, sprites?.lamp);
};
