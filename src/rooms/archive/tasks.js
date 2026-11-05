import { fromScript } from "../../tasks/script.js";
import { scripted } from "../../tasks/scripted.js";
import script from "../../tasks/script/act-1-morning.json" with { type: "json" };
import { hasClass } from "../switchboard/things.js";
import {
  STRIP,
  TABLE,
  collect,
  countOf,
  handleOf,
  isOpen,
  opened,
  pull,
  pullAndRead,
  touch,
} from "./scenario.js";

// Глава 3 (docs/acts/act-1-morning.md). Все задачи — у одной полки. Перед
// вторым проверочным запуском станция переписывает бирки и переносит замок:
// так ловятся номера, вписанные руками.
const task = fromScript(script);

const AT_TABLE = { at: TABLE, pose: `stand` };
const SITTING = { at: TABLE, pose: `sit` };

const drawerAt = (n) => `.drawer[data-n="${n}"]`;

// На бирках вместо 0, 2, 1, 3, 0, 2 — другое.
const retag = (counts) =>
  counts.map((count, index) => ({
    selector: drawerAt(index + 1),
    attribute: `data-count`,
    value: String(count),
  }));
const RETAG = retag([3, 0, 2, 1, 0, 0]);

// Замок с четвёртого — на этот ящик.
const lockOn = (n) => [
  { selector: drawerAt(4), attribute: `class`, value: `drawer` },
  { selector: drawerAt(n), attribute: `class`, value: `drawer locked` },
];

const same = (a, b) => a.join() === b.join();
const clicks = (numbers) =>
  numbers.map((n) => ({ selector: handleOf(n), event: `click` }));

const tagBoard = ({ things }) => things.tagBoard.text.trim();
const tableBoard = ({ things }) => things.tableBoard.text.trim();

// Табло над полкой: она тянет ящики и читает, потом то же на другой разметке.
// expected(n) — что должно быть; judge — что сказать, если не то.
function* readEach(h, numbers, expected, judge) {
  for (const n of numbers) {
    const shown = yield* pullAndRead(h, n);
    if (shown !== expected(n)) return judge(n, shown);
  }
  return true;
}

function* readOnTrial(h, numbers, patch, expected, judge) {
  const result = yield h.trial({ patch, acts: clicks(numbers) });
  if (!result) return false;
  for (const [index, n] of numbers.entries()) {
    const shown = tagBoard(result.acted[index]);
    if (shown !== expected(n, result.world)) return judge(n, shown);
  }
  return true;
}

const wrongBoard = (h) =>
  !h.world().things.tagBoard.text && h.world().things.board.text
    ? `Нашлось табло в щитовой. Здесь табло зовут tag-board.`
    : null;

// Что должно быть на табло над полкой в задачах 3.5 и дальше.
const wordFor =
  ({ locks = false } = {}) =>
  (n, world) => {
    const thing = world.things[`drawer${n}`];
    if (locks && hasClass(thing, `locked`)) return `заперт`;
    const count = countOf(world, n);
    return count === `0` ? `пусто` : `находок ${count}`;
  };

const justOpen = (world, numbers) => same(opened(world), numbers);

export const ARCHIVE_TASKS = [
  task(`archive-all`, {
    check: scripted({
      from: { at: STRIP, pose: `stand` },
      to: AT_TABLE,
      *script(h) {
        const open = opened(h.world());
        const code = h.code();
        if (open.length !== 6) {
          if (same(open, [1]) && code.includes(`forEach`)) {
            return `Внутри — тот ящик, что пришёл в функцию: drawer. querySelector шесть раз нашёл первый.`;
          }
          if (same(open, [1])) {
            yield* touch(h, 1);
            yield* pull(h, 2);
            return `Выдвинулся только первый: querySelector берёт одну вещь. Все — querySelectorAll.`;
          }
          if (/querySelectorAll\([`'"]drawer/.test(code)) {
            return `Список пустой: без точки браузер ищет тег <drawer>.`;
          }
          return false;
        }
        yield* collect(h);
        return true;
      },
    }),
  }),

  task(`archive-push`, {
    check: scripted({
      from: AT_TABLE,
      to: AT_TABLE,
      *script(h) {
        if (!opened(h.world()).length) {
          return `Без () => строка выполнилась сразу. Датчику нужна функция: () => { … }.`;
        }
        yield* pull(h, 1);
        if (isOpen(h.world(), 1)) {
          if (h.code().includes(`.add(`)) {
            return `add добавляет класс, который уже есть. Убрать — remove.`;
          }
          return /[`'"]click[`'"]/.test(h.code())
            ? `silent`
            : `Такого события нет. Регистр важен: click.`;
        }
        yield* pull(h, 5);
        if (isOpen(h.world(), 5)) {
          return `Она тянет пятый, а задвинулся первый. Внутри датчика — drawer, тот, на котором он висит.`;
        }
        yield* collect(h, [2, 3, 6]);
        return true;
      },
    }),
  }),

  task(`archive-tag`, {
    after: () => [
      `drawer.getAttribute(\`data-count\`) делает то же. Разницы в работе нет.`,
    ],
    check: scripted({
      from: AT_TABLE,
      to: AT_TABLE,
      *script(h) {
        const judge = () =>
          wrongBoard(h) ??
          (/dataset\.Count/.test(h.code())
            ? `Регистр важен: count.`
            : `Табло не говорит, что на бирке этого ящика.`);
        const numbers = [1, 4, 6];
        const first = yield* readEach(
          h,
          numbers,
          (n) => countOf(h.world(), n),
          judge,
        );
        if (first !== true) return first;
        const second = yield* readOnTrial(
          h,
          numbers,
          RETAG,
          (n, world) => countOf(world, n),
          () => `Табло не говорит, что на бирке этого ящика.`,
        );
        if (second !== true) return second;
        yield* collect(h, [2, 3, 6]);
        return true;
      },
    }),
  }),

  task(`archive-full`, {
    after: () => [
      `Здесь != 0 сработал бы: он сам переводит строку в число. Но тот же двойной знак считает, что "" == 0. Поэтому профи переводят тип сами и пишут === и !==. В выгруженном проекте за этим следит ESLint (правило eqeqeq).`,
    ],
    check: scripted({
      from: AT_TABLE,
      to: AT_TABLE,
      *script(h) {
        const code = h.code();
        const judge = () => {
          if (/count\s*=\s*[`'"]/.test(code)) {
            return `Один = кладёт, а не сравнивает: ты записал 0 на все бирки. Сравнивают === и !==.`;
          }
          if (/!==\s*0\b/.test(code)) {
            return `С бирки пришла строка "0", а ты сравниваешь с числом 0. Для !== строка и число всегда разные.`;
          }
          if (/if\s*\(\s*drawer\.dataset\.count\s*\)/.test(code)) {
            return `В if любая непустая строка — «да». "0" не пустая. Сравни явно: !== \`0\`.`;
          }
          return `Пустой ящик выдвинут. Она задвинула его сама.`;
        };
        if (!justOpen(h.world(), [2, 3, 4, 6])) return judge();
        const trial = yield h.trial({ patch: RETAG });
        if (trial && !justOpen(trial.world, [1, 3, 4])) {
          return `Условие смотрит на номер, а находки лежат по бирке.`;
        }
        yield* collect(h);
        return true;
      },
    }),
  }),

  task(`archive-empty`, {
    check: scripted({
      from: AT_TABLE,
      to: AT_TABLE,
      *script(h) {
        const word = wordFor();
        const judge = (n, shown) =>
          shown === `находок 0`
            ? `На пустом табло пишет находок 0: вторая строка выполнилась после первой. Ей место в else.`
            : `Табло пишет не то: нужно пусто или находок и число.`;
        const numbers = [1, 6, 4];
        const first = yield* readEach(
          h,
          numbers,
          (n) => word(n, h.world()),
          judge,
        );
        if (first !== true) return first;
        const second = yield* readOnTrial(h, numbers, RETAG, word, judge);
        if (second !== true) return second;
        yield h.walk(TABLE);
        return true;
      },
    }),
  }),

  task(`archive-count`, {
    after: () => [
      `full += 1 и full++ делают то же. Разницы в работе нет, просто короче.`,
    ],
    check: scripted({
      from: AT_TABLE,
      to: AT_TABLE,
      *script(h) {
        const shown = tableBoard(h.world());
        if (shown.includes(`NaN`)) {
          return `NaN — «не число»: к ничему прибавили один. Начни счёт с нуля: let full = 0;.`;
        }
        if (shown !== `ящиков с находками: 4`) {
          return shown
            ? `На табло не то число: ящиков с находками другое.`
            : false;
        }
        const trial = yield h.trial({ patch: RETAG });
        if (trial && tableBoard(trial.world) !== `ящиков с находками: 3`) {
          return `На табло не то число: считай по биркам, а не вписывай руками.`;
        }
        for (const n of [2, 3, 4, 6]) yield* touch(h, n);
        yield h.walk(TABLE);
        return true;
      },
    }),
  }),

  task(`archive-sum`, {
    after: () => [
      `Теперь бирку можно сравнить и как число: Number(drawer.dataset.count) > 0 — то же, что !== \`0\`. > и < — как в школе.`,
    ],
    check: scripted({
      from: AT_TABLE,
      to: AT_TABLE,
      *script(h) {
        const shown = tableBoard(h.world());
        if (shown === `находок: 0021302`) {
          return `+ склеил строки: 0, потом 0, 2, 1… Переведи бирку в число.`;
        }
        if (shown === `находок: 21302`) {
          return `Number опоздал: строки склеились раньше. Переводи бирку, а не сумму.`;
        }
        if (shown.includes(`NaN`)) {
          return `NaN — «не число». С бирки ничего не пришло: регистр, count.`;
        }
        if (shown !== `находок: 8`) {
          return shown ? `На табло не та сумма.` : false;
        }
        const trial = yield h.trial({ patch: RETAG });
        if (trial && tableBoard(trial.world) !== `находок: 6`) {
          return `На табло не та сумма: считай по биркам, а не вписывай руками.`;
        }
        yield* collect(h);
        return true;
      },
    }),
  }),

  task(`archive-locked`, {
    check: scripted({
      from: AT_TABLE,
      to: AT_TABLE,
      *script(h) {
        const word = wordFor({ locks: true });
        const judge = (n, shown) => {
          if (n !== 4 || shown !== `находок 3`) {
            return `Табло пишет не то, что на этом ящике.`;
          }
          const code = h.code();
          if (/contains\(`\.locked/.test(code)) {
            return `Точка нужна только в селекторе. В contains пишут само имя класса.`;
          }
          if (/contains\s*===/.test(code)) {
            return `Метод зовут скобками: contains(\`locked\`).`;
          }
          if (code.indexOf(`contains`) < code.indexOf(`else`)) {
            return `Строки идут сверху вниз. Поставь новый if ниже: кто последний, тот и на табло.`;
          }
          return `Табло обещает три находки, а ящик заперт.`;
        };
        const numbers = [4, 1, 2];
        const first = yield* readEach(
          h,
          numbers,
          (n) => word(n, h.world()),
          judge,
        );
        if (first !== true) return first;
        const second = yield* readOnTrial(
          h,
          [6, 4, 1],
          lockOn(6),
          word,
          () =>
            `Табло пишет заперт по номеру, а замок может быть на другом ящике.`,
        );
        if (second !== true) return second;
        yield h.walk(TABLE);
        return true;
      },
    }),
  }),

  task(`archive-branches`, {
    after: () => [
      `Браузер этой разницы не заметит. Зато условие читается как список случаев: их три, и случится один.`,
    ],
    check: scripted({
      from: AT_TABLE,
      to: AT_TABLE,
      *script(h) {
        const word = wordFor({ locks: true });
        const shown = yield* pullAndRead(h, 4);
        if (shown !== `заперт`) return `Табло обещает находки, а ящик заперт.`;
        if (h.writes() > 1) {
          return `Табло верное, но мигает: на один рывок две записи. Собери ветки в одно условие.`;
        }
        const rest = yield* readEach(
          h,
          [1, 2],
          (n) => word(n, h.world()),
          () => `Табло пишет не то, что на этом ящике.`,
        );
        if (rest !== true) return rest;
        const second = yield* readOnTrial(
          h,
          [5],
          lockOn(5),
          word,
          () =>
            `Ящик заперт, а табло пишет пусто. Первая верная ветка выполнилась, до замка не дошло. Сначала спроси про замок.`,
        );
        if (second !== true) return second;
        yield h.walk(TABLE);
        return true;
      },
    }),
  }),

  task(`archive-carry`, {
    check: scripted({
      from: AT_TABLE,
      to: SITTING,
      *script(h) {
        const shown = tableBoard(h.world());
        if (shown === `можно унести: 0`) {
          return `contains не позвали. Функция для if — «да», ! сделал из неё «нет» на всех ящиках.`;
        }
        if (shown === `можно унести: 8` || shown === `находок: 8`) {
          yield* collect(h);
          yield* touch(h, 4);
          return `Табло считает и запертый.`;
        }
        if (shown !== `можно унести: 5`) {
          return shown ? `На табло не то, что она может унести.` : false;
        }
        const trial = yield h.trial({ patch: lockOn(6) });
        if (trial && tableBoard(trial.world) !== `можно унести: 6`) {
          return `Считай по замкам: сейчас замок на другом ящике, а число то же.`;
        }
        yield* collect(h);
        return true;
      },
    }),
  }),

  task(`archive-truthy`, {
    // Файл писала станция, и он работает с самого входа: лампа зовёт её зря.
    stationCode: true,
    after: ({ code }) => [
      ...(code.includes(`!==`)
        ? [
            `Работает. Ты сравнил явно, и так тоже пишут. А без сравнения if смотрит только на то, пустая ли строка.`,
          ]
        : []),
      `Чаще всего это пригождается так: if (lamp) вместо if (lamp !== null) — нашлась вещь или нет. С бирками осторожнее: строка "0" и число 0 отвечают по-разному, поэтому профи сравнивает явно: Number(first.dataset.count) > 0.`,
    ],
    check: scripted({
      from: SITTING,
      to: SITTING,
      *before(h) {
        yield h.wait(1.5);
        yield* pull(h, 1);
        yield h.walk(TABLE);
      },
      *script(h) {
        const lit = hasClass(h.world().things.shelfLamp, `on`);
        if (lit) {
          yield* pull(h, 1);
          return `Лампа горит, а ящик пуст. Строка "0" непустая, значит, для if это «да».`;
        }
        const trial = yield h.trial({ patch: retag([2, 2, 1, 3, 0, 2]) });
        if (trial && !hasClass(trial.world.things.shelfLamp, `on`)) {
          return /dataset\.Count/.test(h.code())
            ? `NaN тоже falsy: с бирки ничего не пришло. Регистр: count.`
            : `На бирке 2, а лампа тёмная. ! перед непустой строкой всегда даёт «нет».`;
        }
        yield h.walk(TABLE);
        return true;
      },
    }),
  }),

  task(`archive-and`, {
    check: scripted({
      from: SITTING,
      to: SITTING,
      *script(h) {
        if (!justOpen(h.world(), [2, 3, 6])) {
          return h.code().includes(`||`)
            ? `|| — «или»: хватило одной части. Нужны обе: &&.`
            : `Выдвинуты не те ящики: нужны с находками и без замка.`;
        }
        const trial = yield h.trial({ patch: lockOn(6) });
        if (trial && !justOpen(trial.world, [2, 3, 4])) {
          return `Замок теперь на другом ящике. Спрашивай сам ящик, а не его номер.`;
        }
        yield* collect(h);
        return true;
      },
    }),
    after: ({ code }) =>
      /[^&]&[^&]/.test(code)
        ? [
            `Одиночный & — другая операция, над числами. Сработало случайно. «И» — &&.`,
          ]
        : null,
  }),

  task(`archive-return`, {
    after: () => [`Работает.`],
    check: scripted({
      from: SITTING,
      to: SITTING,
      *script(h) {
        const code = h.code();
        if (!justOpen(h.world(), [2, 3, 6])) {
          return /!==\s*`0`\)\s*return/.test(code)
            ? `Выход стоит на ящиках с находками. return — когда ящик не нужен: бирка === \`0\`.`
            : `Выдвинуты не те ящики: нужны с находками и без замка.`;
        }
        const trial = yield h.trial({ patch: lockOn(6) });
        if (trial && !justOpen(trial.world, [2, 3, 4])) {
          return `Замок теперь на другом ящике. Спрашивай сам ящик, а не его номер.`;
        }
        if (
          (code.match(/\breturn\b/g) ?? []).length < 2 ||
          code.includes(`&&`)
        ) {
          return `Работает, но причины всё ещё в одном условии. Каждую — своей строкой: if (…) return;.`;
        }
        yield* collect(h);
        return true;
      },
    }),
  }),

  task(`archive-loop`, {
    after: () => [
      `По времени разницы нет: шесть ящиков — пустяк. Просто нет лишней работы: в показе по шагам видно, что цикл остановился на втором ящике.`,
    ],
    check: scripted({
      from: SITTING,
      to: SITTING,
      *script(h) {
        if (!hasClass(h.world().things.tableLamp, `on`)) return false;
        const trial = yield h.trial({
          patch: retag([0, 0, 0, 0, 0, 0]),
        });
        if (trial && hasClass(trial.world.things.tableLamp, `on`)) {
          return `Лампа горит, а нести нечего.`;
        }
        const code = h.code();
        if (!/\bfor\s*\(.*\bof\b/.test(code) || !/\bbreak\b/.test(code)) {
          return `Работает. Но forEach прошёл все шесть: посмотри показ по шагам. Задача — выйти из цикла, когда нашёл: for…of и break.`;
        }
        yield* collect(h);
        return true;
      },
    }),
  }),

  task(`archive-toggle`, {
    check: scripted({
      from: SITTING,
      // В конце она уходит в проём, в коридор.
      to: { at: [284, 84], pose: `gone` },
      *script(h) {
        yield* pull(h, 1);
        if (!isOpen(h.world(), 1)) {
          return `Ящик не выдвигается. Нужно и то, и другое: toggle.`;
        }
        yield* pull(h, 1);
        if (isOpen(h.world(), 1)) {
          return `Ящик выдвигается, но не задвигается. Нужно и то, и другое.`;
        }
        yield* pull(h, 2);
        if (isOpen(h.world(), 2)) return `Ящик не задвинулся.`;
        yield* pull(h, 2);
        if (!isOpen(h.world(), 2)) return `Ящик не выдвинулся.`;
        h.girl.carrying = true;
        yield h.walk(TABLE);
        h.girl.carrying = false;
        return true;
      },
    }),
  }),
];
