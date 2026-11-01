// Показ по шагам (MECHANICS.md §3.2). Код в песочнице выполнился мгновенно,
// а агент записал, что он делал. Показ разворачивает запись во времени:
// синяя кромка у начатой инструкции, импульс по проводу к найденной вещи,
// вспышка её таблички, мир меняется ровно на своём шаге. Медленно идёт
// первый показ задачи и повтор по Shift+Ctrl+Enter, иначе всё сразу.
const DIP = 500;
const LEAD = 300;
const STEP = 300;
const CHANGE = 500;
const MISS = 300;
const PULSE = { run: 500, hold: 400, fade: 300 };

// Импульс сейчас: докуда дошёл и какой плотности провод. Дошёл — провод
// горит целиком, потом гаснет, а если результат сохранён — остаётся
// висеть на 50 %: переменная держит вещь.
export const pulseLook = ({ start, kept }, now) => {
  const t = now - start;
  if (t < PULSE.run) return { density: 1, upTo: t / PULSE.run, head: true };
  if (t < PULSE.run + PULSE.hold) return { density: 1 };

  const fade = Math.min(1, (t - PULSE.run - PULSE.hold) / PULSE.fade);
  return { density: kept ? 1 - fade / 2 : 1 - fade };
};

const pulseOver = ({ start }, now) =>
  now >= start + PULSE.run + PULSE.hold + PULSE.fade;

export const createReplay = ({ onWorld, onError, onFlash, onSlowShown }) => {
  // Что рисуют терминал и сцена. Кромки и висящие провода остаются после
  // показа: кромки — до правки кода, провода — до следующего запуска.
  const view = {
    lines: new Map(),
    bright: new Set(),
    pulses: [],
    kept: [],
    dip: 0,
    slow: false,
  };
  let show = null;

  // Начатая инструкция: её строки горят, тела функций в ней ждут.
  const light = (n) => {
    const statement = show.marked?.statements[n];
    if (!statement) return;

    show.stepped = true;
    statement.waits.forEach((line) => {
      if (!view.lines.has(line)) view.lines.set(line, `waiting`);
    });
    statement.lines.forEach((line) => view.lines.set(line, `lit`));
  };

  const find = (event, begin) => {
    if (!event.count || event.file !== show.file) return;

    const call = show.marked?.callAt(event.line, event.column);
    const wire = { rects: event.rects, keys: event.keys, kept: !!call?.kept };
    if (!show.slow) {
      if (wire.kept) view.kept.push(wire);
      return;
    }

    view.pulses.push({ ...wire, start: begin, lines: call?.lines ?? [] });
    const arrived = begin + PULSE.run;
    onFlash(event.keys, arrived, arrived + PULSE.hold);
  };

  const play = (item, begin) => {
    if (item.kind === `world` || item.kind === `change`) onWorld(item.world);
    if (item.kind === `step`) light(item.n);
    if (item.kind === `find`) find(item, begin);
    if (item.kind === `error`) onError(item.error);
    if (item.kind === `done`) show.done = true;
  };

  // Сколько длится шаг в медленном показе. Пока не начался твой файл
  // (до первой метки идут решённые файлы станции), всё мгновенно.
  const pace = (item) => {
    if (!show.stepped) return 0;
    if (item.kind === `step`) return STEP;
    if (item.kind === `change`) return CHANGE;
    if (item.kind !== `find` || item.file !== show.file) return 0;
    return item.count ? PULSE.run + PULSE.hold : MISS;
  };

  const finish = () => {
    view.slow = false;
    if (show.wasSlow && show.stepped) onSlowShown();
    show.finished = true;
  };

  const update = (now) => {
    view.pulses = view.pulses.filter((pulse) => {
      if (!pulseOver(pulse, now)) return true;
      if (pulse.kept) view.kept.push(pulse);
      return false;
    });
    view.bright = new Set(
      view.pulses
        .filter(({ start }) => now < start + PULSE.run + PULSE.hold)
        .flatMap(({ lines }) => lines),
    );
    if (!show) return;

    while (show.queue.length && show.at <= now) {
      const item = show.queue.shift();
      const begin = show.at;
      play(item, begin);
      show.at = begin + (show.slow ? pace(item) : 0);
    }
    // Запись пришла позже, чем показ до неё дошёл, — играем с этой минуты.
    show.at = Math.max(show.at, now);

    // Свет проседает и возвращается: плотность тени растёт и спадает.
    const t = (now - show.started) / DIP;
    view.dip = show.dip && t < 1 ? 0.6 * Math.sin(Math.PI * t) : 0;

    if (show.done && !show.finished && !show.queue.length && now >= show.at) {
      finish();
    }
  };

  return {
    view,
    update,

    start: ({ slow, dip, marked, file }, now = performance.now()) => {
      show = {
        slow,
        wasSlow: slow,
        dip,
        marked,
        file,
        queue: [],
        started: now,
        at: now + (dip ? DIP : slow ? LEAD : 0),
        stepped: false,
        done: false,
        finished: false,
      };
      view.lines.clear();
      view.bright.clear();
      view.pulses = [];
      view.kept = [];
      view.dip = 0;
      view.slow = slow;
    },

    // Сообщение песочницы: снимок мира, шаг записи, ошибка или конец.
    // Без медленного показа оно играет сразу, не дожидаясь кадра.
    receive: (item) => {
      if (!show) return;
      show.queue.push(item);
      if (!show.slow) update(performance.now());
    },

    // Любая клавиша: всё, что осталось, — сразу.
    skip: () => {
      if (!show?.slow) return;
      const now = performance.now();
      show.slow = false;
      show.dip = false;
      show.at = now;
      view.slow = false;
      view.pulses
        .filter(({ kept }) => kept)
        .forEach((pulse) => {
          view.kept.push(pulse);
        });
      view.pulses = [];
      onFlash([], 0, 0);
      update(now);
    },

    // Песочница зависла: конца записи не будет.
    stop: () => {
      if (!show) return;
      show.slow = false;
      show.done = true;
      show.at = performance.now();
      update(show.at);
    },

    // Правка кода: строки сдвинулись, старые кромки уже не про них.
    clearLines: () => {
      view.lines.clear();
      view.bright.clear();
    },
  };
};
