import layout from "../../../assets/sprites/bg-archive.json" with { type: "json" };
import { grey } from "../../render/palette.js";
import { rect } from "../../render/pixels.js";

// Архив находок (глава 3): фон от Codex (assets/sprites/bg-archive.png), полка,
// ящики и стол — спрайты, нарисованные по пикселю (tools/draw_archive.py).
// Вещи в room.css стоят там же — это проверяет test/room.test.js.
const MINI = { w: 10, h: 8, mini: true };

const TAG_BOARD = { x: 76, y: 22, w: 56, h: 10 };
const TABLE_BOARD = { x: 210, y: 40, w: 56, h: 20 };

export const ARCHIVE = {
  shutter: layout.shutter,
  doorIn: layout.doorIn,
  doorOut: layout.doorOut,
  shelf: layout.shelf,
  table: layout.table,
  floor: { top: layout.floorY, bottom: 106 },
  shelfLamp: { x: 50, y: 15, w: 14, h: 20 },
  tableLamp: { x: 231, y: 12, w: 14, h: 20 },
  tagBoard: TAG_BOARD,
  tableBoard: TABLE_BOARD,
  // Ящик n: гнездо на полке. Номер — трафарет на нём, это его табличка.
  drawer: (n) => ({ x: 44 + 16 * (n - 1), y: 48, w: 14, h: 22 }),
  plates: {
    shelfLamp: { x: 76, y: 13, w: 56, h: 7, slot: true },
    tableLamp: { x: 210, y: 33, w: 56, h: 7, slot: true },
    tagBoard: { ...TAG_BOARD, onThing: true },
    tableBoard: { ...TABLE_BOARD, onThing: true },
  },
  // По экрану на файл, у входной двери.
  screens: [
    { x: 3, y: 5, ...MINI },
    { x: 16, y: 5, ...MINI },
    { x: 29, y: 5, ...MINI },
    { x: 3, y: 17, ...MINI },
    { x: 16, y: 17, ...MINI },
    { x: 29, y: 17, ...MINI },
  ],
};

export const drawArchive = (ctx, { roomPresent, sprites }) => {
  if (!roomPresent || !sprites?.background) {
    rect(ctx, grey[0], 0, 0, 320, 180);
    return;
  }

  ctx.drawImage(sprites.background, 0, 0);
  ctx.drawImage(sprites.shelf, ARCHIVE.shelf.x, ARCHIVE.shelf.y);
  ctx.drawImage(sprites.table, ARCHIVE.table.x, ARCHIVE.table.y);
};
