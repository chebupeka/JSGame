import { snapshotCheck } from "../../tasks/check.js";
import { fromScript } from "../../tasks/script.js";
import script from "../../tasks/script/act-1-morning.json" with { type: "json" };
import { FRAME_ROOM } from "./backdrop.js";
import { SEAT, STOPS, knobCheck, windowFollows } from "./scenario.js";

// Глава 2 (docs/acts/act-1-morning.md). С 2.2 она проверяет как тест: каждый
// раз пробует ручку заново, и прошлое должно работать по-прежнему.
const { shutter } = FRAME_ROOM;

export const STRIP = [shutter.x + Math.round(shutter.w / 2), 92];
const AT_BOARD = [240, 88];

const task = fromScript(script);

// Что сделать при входе: ручка там, где она её оставила, поэтому окна снова
// светят — решённые файлы получают то же событие, что и тогда.
const KNOB_LEFT = [
  { key: `picker`, value: STOPS.at(-1), event: `input` },
  { key: `picker`, event: `change` },
];

const own = (sensors, file) =>
  [...sensors.values()].filter((sensor) => sensor.file === file);

const quoted = (code, selector) =>
  new RegExp(`[\`'"]${selector}[\`'"]`).test(code);

const follows = ({ things: { frame, picker } }) =>
  windowFollows(frame, picker.value);

const NO_EVENT = `Такого события нет. JavaScript о таких опечатках молчит.`;

export const FRAME_TASKS = [
  task(`frame-value`, {
    check: snapshotCheck({
      from: { at: STRIP, pose: `stand` },
      to: { at: SEAT, pose: `stand` },
      test: (world, { code }) => {
        if (follows(world)) return true;
        const painted = world.things.frame.background !== `rgba(0, 0, 0, 0)`;
        if (painted) {
          return `Окно горит, но не цветом ручки. Возьми цвет у самой ручки.`;
        }
        if (world.things.picker.value === `#000000`) {
          return `= кладёт справа налево. Слева — то, что меняешь.`;
        }
        if (code.includes(`#frame-picker`) && !code.includes(`.value`)) {
          return `Окну дали ручку целиком, а не её цвет. Цвет лежит в value.`;
        }
        return false;
      },
      // Цвет вписан руками совпал бы с ручкой: ставим ей другой и смотрим снова.
      again: {
        patch: [
          { selector: `#frame-picker`, attribute: `value`, value: STOPS[1] },
        ],
        test: (world) =>
          follows(world) ||
          `Окно горит, но не цветом ручки. Возьми цвет у самой ручки.`,
      },
    }),
  }),

  task(`frame-listen`, {
    waiting: `Пока ничего. Так и надо: ты не покрасил окно, а сказал, что делать, когда крутят ручку.`,
    after: () => [
      `Работает. Функцию, которую отдают датчику, зовут обработчиком: она обрабатывает событие.`,
    ],
    check: knobCheck({
      from: { at: SEAT, pose: `stand` },
      tryout: true,
      judge: ({ sensors }) => {
        const mine = own(sensors, `frame.js`);
        if (!mine.length) {
          return `Окно горит, но ручка всё ещё ни к чему не подключена.`;
        }
        if (mine.some(({ type }) => type === `input`)) return `silent`;
        if (mine.some(({ type }) => type === `click`)) {
          return `click — щелчок по ручке. Когда крутят, ручка шлёт input.`;
        }
        return NO_EVENT;
      },
    }),
  }),

  task(`frame-target`, {
    entryActs: KNOB_LEFT,
    after: ({ code }) =>
      /\bevent\.target/.test(code)
        ? [
            `Это сработало случайно: в браузере есть старое общее имя event. Пиши своё: (evt) =>.`,
          ]
        : null,
    check: knobCheck({
      judge: ({ code }) =>
        /\bevt\.value\b/.test(code)
          ? `У события нет value. value — у вещи: evt.target.value.`
          : `silent`,
      extra: ({ foundKeys }) =>
        foundKeys.has(`picker`)
          ? `Работает, но ручку всё ещё ищут на каждый щелчок. Событие уже знает, откуда пришло.`
          : null,
    }),
  }),

  task(`small-ladder`, {
    entryActs: KNOB_LEFT,
    ladder: `Лесенка не быстрее: в мире разницы нет. Зато ошибка укажет на звено: «строка 13, столбец 3» вместо «строка 11, столбец 39».`,
    after: ({ code }) =>
      code.split(`\n`).some((line) => line.length > 60)
        ? [
            `Работает. Лесенка ничего не ускоряет. Она для людей: ошибка покажет точное звено.`,
          ]
        : null,
    check: knobCheck({
      follows: ({ things: { frame, frameSmall } }, value) =>
        windowFollows(frame, value) && windowFollows(frameSmall, value),
      judge: ({ code }) =>
        quoted(code, `\\.frame`)
          ? `Опять первое по разметке: .frame — большое окно. У окошка есть свой класс.`
          : `silent`,
    }),
  }),

  task(`small-change`, {
    entryActs: KNOB_LEFT,
    after: () => [
      `change — для того, что делают один раз, когда человек закончил: сохранить, записать. Это понадобится в Коридоре.`,
    ],
    check: knobCheck({
      release: true,
      follows: ({ things: { frame, frameSmall } }, value) =>
        windowFollows(frame, value) && windowFollows(frameSmall, value),
      holds: (world, before) =>
        world.things.frameSmall.background ===
        before.things.frameSmall.background,
      judge: ({ sensors }) => {
        const mine = own(sensors, `small.js`);
        if (mine.some(({ key }) => key === `frameSmall`)) {
          return `Датчик ставят на вещь, которая шлёт событие. change шлёт ручка.`;
        }
        if (mine.some(({ type }) => type === `input`)) {
          return `Окошко меняется, а она ещё не отпустила ручку.`;
        }
        if (!mine.some(({ type }) => type === `change`)) {
          return `Такого события нет. Регистр важен: change.`;
        }
        return `silent`;
      },
    }),
  }),

  task(`frame-once`, {
    entryActs: KNOB_LEFT,
    after: ({ code }) => [
      `Браузер ищет быстро, дело не в миллисекундах. Дело в лишней работе там, где срабатывает десятки раз в секунду, и в том, что у окна теперь есть имя.`,
      ...(code.includes(`({ target })`)
        ? []
        : [
            `Так тоже пишут: ({ target }) => { … target.value … }. Это не быстрее, просто сразу видно, что функции нужен только target. Можешь не пользоваться.`,
          ]),
    ],
    check: knobCheck({
      extra: ({ finds }) =>
        finds
          ? `Имя есть, но поиск всё ещё внутри датчика. Подними строку выше.`
          : null,
    }),
  }),

  task(`color-board`, {
    entryActs: KNOB_LEFT,
    after: () => [
      `Плюс тоже склеивает строки. \${} проще читать, когда вставок несколько.`,
    ],
    check: knobCheck({
      release: true,
      visit: AT_BOARD,
      follows: ({ things: { colorBoard } }, value) =>
        colorBoard.text.trim() === `цвет ${value}`,
      judge: ({ world, code }) => {
        const shown = world.things.colorBoard.text;
        if (!shown && world.things.board.text.startsWith(`цвет`)) {
          return `Нашлось табло в щитовой: оно раньше по разметке. Здесь табло зовут color-board.`;
        }
        if (/\$\(|\{evt/.test(shown)) {
          return `Вставка пишется \${…}: знак доллара и фигурные скобки.`;
        }
        if (shown) {
          return `Табло пишет не то, что она ищет: нужно и слово, и значение.`;
        }
        return code.includes(`change`) ? `silent` : false;
      },
    }),
  }),
];
