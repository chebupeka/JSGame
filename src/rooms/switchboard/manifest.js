import { SWITCHBOARD } from "./backdrop.js";
import css from "./room.css?raw";
import html from "./room.html?raw";

// Что в щитовой — вещи, а что просто стена. Вещь = настоящий элемент
// в песочнице; её классы — кадры спрайта (`on` — лампа горит).
// plate — ровная площадка на стене, где выбита табличка вещи.
export const SWITCHBOARD_ROOM = { html, css };

const { plates } = SWITCHBOARD;

export const SWITCHBOARD_THINGS = [
  { key: `lamp`, selector: `#lamp`, plate: SWITCHBOARD.plate },
  { key: `board`, selector: `#board`, plate: plates.board },
  // У этой лампы нет id, а первый её класс — общий на все лампы. На трафарете
  // тот класс, который есть только у неё.
  {
    key: `doorLamp`,
    selector: `.switchboard .door-lamp`,
    plate: plates.doorLamp,
    plateClass: `door-lamp`,
  },
  { key: `plafond`, selector: `#plafond`, plate: plates.plafond },
];

// Имена в разметке комнаты: из них разбор ошибки ищет «похоже на».
// labels — где это имя выбито, для фразы «На лампе выбито `lamp`…».
export const SWITCHBOARD_NAMES = {
  ids: [...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => id),
  classes: [
    ...new Set(
      [...html.matchAll(/class="([^"]+)"/g)].flatMap(([, list]) =>
        list.split(/\s+/),
      ),
    ),
  ],
  labels: {
    lamp: `на лампе`,
    board: `на табло`,
    plafond: `на плафоне`,
    "door-lamp": `на трафарете`,
  },
};
