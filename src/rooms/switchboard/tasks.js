import { glassLevel } from "../../render/glass.js";
import { snapshotCheck } from "../../tasks/check.js";
import { fromScript } from "../../tasks/script.js";
import script from "../../tasks/script/act-1-morning.json" with { type: "json" };
import { SWITCHBOARD } from "./backdrop.js";
import { hasClass } from "./things.js";

// Глава 1 (docs/acts/act-1-morning.md). Каждая задача сдвигает её на одно
// место: полоска под ставнем → порог → села на пороге → встала в проёме →
// скрылась в тамбуре. В темноту она не идёт: проходит ровно столько,
// сколько освещено.
const { shutter, door } = SWITCHBOARD;
const DOOR_X = door.x + Math.round(door.w / 2);
const FLOOR_Y = door.y + door.h;

export const STRIP = [shutter.x + Math.round(shutter.w / 2), 92];
export const THRESHOLD = [DOOR_X, FLOOR_Y + 5];
const DOORWAY = [DOOR_X, FLOOR_Y + 1];
const DEEP = [DOOR_X, FLOOR_Y - 4];

// Свет считается светом, если он не темнее сигнального синего.
const BRIGHT = glassLevel(`rgb(87, 154, 243)`);

const task = fromScript(script);

// Текст табло, как она его читает: большие буквы и пробелы с точками
// по краям ей не важны.
const reading = (text = ``) =>
  text.replace(/^[\s.]+|[\s.]+$/g, ``).toLowerCase();

export const SWITCHBOARD_TASKS = [
  task(`lamp`, {
    check: snapshotCheck({
      from: { at: STRIP, pose: `stand` },
      to: { at: THRESHOLD, pose: `stand` },
      test: ({ things: { lamp } }) => {
        if (hasClass(lamp, `on`)) return true;
        if (hasClass(lamp, `On`) || hasClass(lamp, `ON`)) {
          return `Класс добавлен, но в CSS станции он пишется on, маленькими. Регистр важен.`;
        }
        if (hasClass(lamp, `.on`)) {
          return `Точка нужна только в селекторе. В add пишут само имя класса.`;
        }
        return false;
      },
    }),
  }),

  task(`board`, {
    after: () => [
      `Настоящее имя вещи — элемент: табло — это элемент <div>. В книгах пишут «элемент», здесь чаще говорим «вещь».`,
    ],
    check: snapshotCheck({
      from: { at: THRESHOLD, pose: `stand` },
      to: { at: THRESHOLD, pose: `sit` },
      test: ({ things: { board } }, { code }) => {
        if (reading(board.text) === `к окну`) return true;
        if (board.text) return `Табло горит, но написано не то, что она ищет.`;
        if (code.includes(`.textcontent`)) {
          return `Регистр важен: textContent, с большой C.`;
        }
        return false;
      },
    }),
  }),

  task(`door-lamp`, {
    after: () => [
      `По id ищут вещь, которая одна. По классу — когда id нет или вещей много (это будет в Архиве).`,
    ],
    check: snapshotCheck({
      from: { at: THRESHOLD, pose: `sit` },
      to: { at: DOORWAY, pose: `stand` },
      test: ({ things: { doorLamp } }, { code }) => {
        if (hasClass(doorLamp, `on`)) return true;
        if (/[`'"]\.lamp[`'"]/.test(code)) {
          return `querySelector взял первую лампу по разметке, ту, что на стене. В тусклых уголках — вторая. Нужен класс, который есть только у неё.`;
        }
        return false;
      },
    }),
  }),

  task(`plafond`, {
    after: () => [
      `style — для значения, которое задаёшь прямо. Если у вещи в CSS есть класс состояния, как on у ламп, проще добавить класс.`,
    ],
    check: snapshotCheck({
      from: { at: DOORWAY, pose: `stand` },
      to: { at: DEEP, pose: `gone` },
      test: ({ things: { plafond } }, { code }) => {
        const level = glassLevel(plafond.background);
        if (level !== null && level >= BRIGHT) return true;
        if (level !== null) {
          return `Плафон горит, но тускло. Станция видит только яркость. Щуп покажет, какой цвет на самом деле лежит на странице.`;
        }
        if (code.includes(`.style.backgroundcolor`)) {
          return `Регистр: backgroundColor, с большой C.`;
        }
        if (/\.backgroundColor\s*=/.test(code) && !code.includes(`.style.`)) {
          return `Вещь получила лишнее свойство, а CSS его не видит. Цвет кладут в style: .style.backgroundColor.`;
        }
        if (code.includes(`.style.backgroundColor`)) return `silent`;
        return false;
      },
    }),
  }),
];
