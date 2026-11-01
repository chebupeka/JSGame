import { SWITCHBOARD } from "../rooms/switchboard/backdrop.js";
import { blue, blueGlow, grey } from "../render/palette.js";
import { ditherShape, dot, rect } from "../render/pixels.js";

// Макет пола (только в разработке): где лягут пятно лампы и параллелограмм
// окна и где она будет стоять и сидеть. Проверяем, что на полосе пола
// хватает места для всего среза при любом варианте терминала.
const silhouette = (ctx, x, feet, height) => {
  const top = feet - height;
  rect(ctx, grey[4], x + 4, top, 6, 6);
  rect(ctx, grey[4], x + 2, top + 6, 10, height - 6);
  rect(ctx, grey[1], x + 2, top + 6, 1, 1);
  rect(ctx, grey[1], x + 11, top + 6, 1, 1);
};

export const drawFloorMockup = (ctx, { floor }) => {
  const bottom = floor.y + floor.h;

  for (let x = 0; x < 320; x += 2) {
    dot(ctx, blueGlow, x, floor.y + 1);
    dot(ctx, blueGlow, x, bottom - 1);
  }

  // Пятно лампы: от стены под лампой до порога двери.
  const { lamp, door } = SWITCHBOARD;
  ditherShape(
    ctx,
    blue,
    floor.y + 1,
    Math.min(bottom - 1, floor.y + 20),
    (y) => [
      door.x - 4 + (y - floor.y) * 0.3,
      lamp.x + 14 - (y - floor.y) * 0.6,
    ],
    0.5,
  );

  // Параллелограмм от окна (глава 2): не меньше 40×16.
  ditherShape(
    ctx,
    blue,
    floor.y + 6,
    floor.y + 22,
    (y) => {
      const shift = (y - floor.y - 6) * 0.8;
      return [236 - shift, 280 - shift];
    },
    1,
  );

  silhouette(ctx, 198, floor.y + 22, 36);
  silhouette(ctx, 248, floor.y + 22, 24);
};
