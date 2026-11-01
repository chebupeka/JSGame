import { grey } from "../render/palette.js";
import { dot, rect } from "../render/pixels.js";
import { drawSprite } from "../render/sprites.js";

// Корпус ЭЛТ: верх большого кинескопа вплотную к камере, низ срезан краем
// кадра. В крупном варианте — спрайт от Codex (assets/sprites/terminal.png,
// стекло 200×63 ровно по раскладке), в компактном — пока корпус кодом.
const drawCodeBody = (ctx, { body, edge, glass, socket }) => {
  rect(ctx, grey[1], body.x, body.y, body.w, body.h);
  rect(ctx, grey[0], body.x, body.y, 2, body.h);
  rect(ctx, grey[0], body.x + body.w - 1, body.y, 1, body.h);

  rect(ctx, grey[2], edge.x, edge.y, edge.w - 1, edge.h);
  rect(ctx, grey[3], edge.x + 3, edge.y, edge.w - 8, 1);
  rect(ctx, grey[1], edge.x, edge.y + edge.h - 1, edge.w - 1, 1);

  for (let i = 0; i < 24; i++) {
    const x = edge.x + 4 + ((i * 37) % (edge.w - 10));
    dot(ctx, i % 3 ? grey[4] : grey[1], x, edge.y + (i % 2));
  }

  rect(ctx, grey[2], glass.x - 1, glass.y - 1, glass.w + 2, glass.h + 1);
  rect(ctx, grey[0], glass.x, glass.y, glass.w, glass.h);

  rect(ctx, grey[0], socket.x, socket.y, 4, 4);
  dot(ctx, grey[3], socket.x + 1, socket.y + 1);
};

export const drawTerminalBody = (ctx, layout, sprite) => {
  if (layout.sprite && sprite) {
    drawSprite(ctx, sprite, layout.body.x, layout.body.y);
  } else {
    drawCodeBody(ctx, layout);
  }

  // Пунктир между кодом и полями.
  const { divider } = layout;
  for (let y = divider.y; y < divider.y + divider.h; y += 3) {
    rect(ctx, grey[2], divider.x, y, 1, 2);
  }
};
