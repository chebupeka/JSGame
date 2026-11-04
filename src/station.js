import { FRAME_PLACE } from "./rooms/frame-room/place.js";
import { SWITCHBOARD_PLACE } from "./rooms/switchboard/place.js";

// Места станции по порядку дня (MECHANICS.md §7). Место — комната, её
// вещи, задача и её путь по комнате.
export const PLACES = [SWITCHBOARD_PLACE, FRAME_PLACE];

// Станция — один документ: все комнаты друг под другом, каждая 320×180.
// Решённые файлы работают в нём всегда, поэтому из любой комнаты код
// находит вещи прошлых. На экране одна комната: агент считает рамки вещей
// от её верха, и они сразу совпадают с пикселями сцены.
const ROOM_HEIGHT = 180;

const STATION_CSS = `
html {
  overflow: hidden;
}

body {
  margin: 0;
}

.room {
  position: relative;
  width: 320px;
  height: 180px;
  overflow: hidden;
}
`;

export const STATION = {
  html: `<div class="station">${PLACES.map(({ room }) => room.html).join(``)}</div>`,
  css: [STATION_CSS, ...PLACES.map(({ room }) => room.css)].join(`\n`),
  root: `.station`,
};

export const STATION_THINGS = PLACES.flatMap(({ things }) => things);

// Имена со всей станции: «похоже на» ищет и среди вещей прошлых комнат.
export const STATION_NAMES = {
  ids: PLACES.flatMap(({ names }) => names.ids),
  classes: [...new Set(PLACES.flatMap(({ names }) => names.classes))],
  labels: Object.assign({}, ...PLACES.map(({ names }) => names.labels)),
};

// Где верх комнаты этого места в документе станции.
export const viewOf = (place) => PLACES.indexOf(place) * ROOM_HEIGHT;

// Где игрок сейчас: первое место с нерешённой задачей, а если решено
// всё — последнее.
export const currentPlace = (solved) =>
  PLACES.find(({ task }) => !solved[task.file]) ?? PLACES.at(-1);

export const nextPlace = (place) => PLACES[PLACES.indexOf(place) + 1] ?? null;

// Решённые файлы станции, которые работают до этого места.
export const solvedBefore = (place, solved) =>
  PLACES.slice(0, PLACES.indexOf(place))
    .filter(({ task }) => solved[task.file])
    .map(({ task }) => ({ name: task.file, code: solved[task.file] }));
