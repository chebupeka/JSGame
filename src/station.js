import { FRAME_PLACE } from "./rooms/frame-room/place.js";
import { SWITCHBOARD_PLACE } from "./rooms/switchboard/place.js";

// Места станции по порядку дня (MECHANICS.md §7). Место — комната, её
// вещи и задачи главы.
export const PLACES = [SWITCHBOARD_PLACE, FRAME_PLACE];

// Все задачи подряд. Каждая знает своё место.
export const TASKS = PLACES.flatMap((place) =>
  place.tasks.map((task) => ({ ...task, place })),
);

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
