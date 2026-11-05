import { drawLightIn } from "../../render/light.js";
import { grey } from "../../render/palette.js";
import { drawPlates } from "../../render/plates.js";
import { rect } from "../../render/pixels.js";
import { drawBoard } from "../board.js";
import { drawMonitors } from "../switchboard/monitor.js";
import { hasClass } from "../switchboard/things.js";
import { ARCHIVE, drawArchive } from "./backdrop.js";
import css from "./room.css?raw";
import html from "./room.html?raw";
import { STRIP, TABLE } from "./scenario.js";
import { ARCHIVE_TASKS } from "./tasks.js";

// Место 3 — архив находок, позднее утро (глава 3). Вдоль дальней стены полка
// с шестью ящиками, у морской стены стол. Над полкой и над столом лампы.
const NUMBERS = [1, 2, 3, 4, 5, 6];
const { plates } = ARCHIVE;

const THINGS = [
  { key: `shelfLamp`, selector: `#shelf-lamp`, plate: plates.shelfLamp },
  { key: `tagBoard`, selector: `#tag-board`, plate: plates.tagBoard },
  ...NUMBERS.map((n) => ({
    key: `drawer${n}`,
    selector: `.drawer[data-n="${n}"]`,
    // Трафарет — номер ящика, а селектор у всех один: .drawer.
    plate: { follow: { x: 0, y: 1, w: 14, h: 7 }, label: String(n) },
    events: [`click`],
  })),
  { key: `tableLamp`, selector: `#table-lamp`, plate: plates.tableLamp },
  { key: `tableBoard`, selector: `#table-board`, plate: plates.tableBoard },
];

const NAMES = {
  ids: [...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => id),
  classes: [
    ...new Set(
      [...html.matchAll(/class="([^"]+)"/g)].flatMap(([, list]) =>
        list.split(/\s+/),
      ),
    ),
  ],
  labels: {
    "tag-board": `на табло`,
    "table-board": `на табло`,
    "shelf-lamp": `на лампе`,
    "table-lamp": `на лампе`,
    drawer: `на ящике`,
  },
};

const drawDrawer = (ctx, thing, sheet) => {
  if (!thing?.present || thing.rect.width < 1 || !sheet) return;
  const x = Math.round(thing.rect.x);
  const y = Math.round(thing.rect.y);
  const locked = hasClass(thing, `locked`);
  const frame = locked ? 2 : hasClass(thing, `open`) ? 1 : 0;
  ctx.drawImage(sheet, frame * 14, 0, 14, 22, x, y, 14, 22);
  // Бумажная бирка: светло-серая, белый в мире только снаружи.
  rect(ctx, grey[4], x + 3, y + 16, 8, 4);
  rect(ctx, grey[2], x + 4, y + 17, 5, 1);
  rect(ctx, grey[2], x + 4, y + 18, 3, 1);
};

const drawLampSprite = (ctx, lamp, sheet) => {
  if (!lamp?.present || lamp.rect.width < 1 || !sheet) return;
  const frame = hasClass(lamp, `on`) ? 1 : 0;
  ctx.drawImage(
    sheet,
    frame * 14,
    0,
    14,
    20,
    Math.round(lamp.rect.x),
    Math.round(lamp.rect.y),
    14,
    20,
  );
};

// Лампа горит — под ней на стене и на полу синий свет. Его сделал твой код.
const drawLampLight = (ctx, lamp, box) => {
  if (!hasClass(lamp, `on`)) return;
  const cx = lamp.rect.x + 7;
  const cy = lamp.rect.y + 16;
  drawLightIn(
    ctx,
    box,
    (x, y) => 0.7 - Math.hypot((x - cx) / 40, (y - cy) / 44),
  );
};

// Находки на столе: то, что она принесла, рядком.
const drawFinds = (ctx, count) => {
  const { x, y } = ARCHIVE.table;
  for (let i = 0; i < Math.min(count, 6); i += 1) {
    rect(ctx, grey[4], x + 4 + i * 6, y - 3, 4, 3);
    rect(ctx, grey[1], x + 4 + i * 6, y - 1, 4, 1);
  }
};

export const ARCHIVE_PLACE = {
  key: `archive`,
  room: { html, css },
  things: THINGS,
  names: NAMES,
  tasks: ARCHIVE_TASKS,
  layout: ARCHIVE,
  path: [STRIP, TABLE],
  // Здесь она много ходит вдоль полки: ждать её долго незачем.
  walkSpeed: 36,

  draw: (ctx, view) => {
    const { world, sprites, roomPresent, monitors, girl } = view;
    const set = sprites?.archive;
    drawArchive(ctx, { roomPresent, sprites: set });
    if (!roomPresent) return;

    const things = world?.things;
    drawLampLight(ctx, things?.shelfLamp, { x: 30, y: 15, w: 120, h: 91 });
    drawLampLight(ctx, things?.tableLamp, { x: 200, y: 12, w: 76, h: 94 });
    NUMBERS.forEach((n) =>
      drawDrawer(ctx, things?.[`drawer${n}`], set?.drawer),
    );
    drawLampSprite(ctx, things?.shelfLamp, sprites?.lamp);
    drawLampSprite(ctx, things?.tableLamp, sprites?.lamp);
    drawBoard(ctx, things?.tagBoard);
    drawBoard(ctx, things?.tableBoard);
    drawFinds(ctx, girl?.onTable ?? 0);
    drawPlates(ctx, THINGS, view);
    drawMonitors(ctx, ARCHIVE.screens, monitors);
  },
};
