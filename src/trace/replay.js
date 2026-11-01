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

// Провод в пустоту: поиск ничего не нашёл. Импульс добегает до конца,
// а там ничего — провод повисает и качается. Он серо-синий: ток туда
// не дошёл (красного в игре нет). sway — на сколько качнулся конец.
export const looseLook = ({ start, run }, now) => {
  const t = now - start;
  if (t < run) return { upTo: t / run, head: true, live: true, sway: 0 };

  const s = (t - run) / 1000;
  const sway = 4 * Math.sin(s * 4.5) * Math.exp(-s / 2) + Math.sin(s * 2.1);
  return { upTo: 1, head: false, live: false, sway };
};

// Свет проседает и возвращается: плотность тени растёт и спадает.
const dipAt = (dips, now) =>
  Math.max(
    0,
    ...dips
      .map((at) => (now - at) / DIP)
      .filter((t) => t >= 0 && t < 1)
      .map((t) => 0.6 * Math.sin(Math.PI * t)),
  );

export const createReplay = ({
  onWorld,
  onError,
  onFlash,
  onSlowShown,
  onPulse = () => {},
  onHalt = () => {},
}) => {
  // Что рисуют терминал и сцена. Кромки и висящие провода остаются после
  // показа: кромки — до правки кода, провода — до следующего запуска.
  const view = {
    lines: new Map(),
    bright: new Set(),
    pulses: [],
    kept: [],
    loose: null,
    dip: 0,
    slow: false,
  };
  let show = null;

  // Начатая инструкция: её строки горят, тела функций в ней ждут.
  const light = (n) => {
    const statement = show.marked?.statements[n];
    if (!statement) return;

    show.stepped = true;
    show.last = statement;
    statement.waits.forEach((line) => {
      if (!view.lines.has(line)) view.lines.set(line, `waiting`);
    });
    statement.lines.forEach((line) => view.lines.set(line, `lit`));
  };

  const find = (event, begin) => {
    if (event.file !== show.file) return;
    if (!event.count) {
      view.loose = { start: begin, run: show.slow ? PULSE.run : 0 };
      if (show.slow) onPulse(null);
      return;
    }

    const call = show.marked?.callAt(event.line, event.column);
    const wire = { rects: event.rects, keys: event.keys, kept: !!call?.kept };
    if (!show.slow) {
      if (wire.kept) view.kept.push(wire);
      return;
    }

    view.pulses.push({ ...wire, start: begin, lines: call?.lines ?? [] });
    onPulse(event.rects[0]);
    const arrived = begin + PULSE.run;
    onFlash(event.keys, arrived, arrived + PULSE.hold);
  };

  // Ошибка при выполнении: свет проседает, а у упавшей инструкции гаснут
  // строки ниже места ошибки и тела функций — туда код не дошёл.
  const fail = ({ file, line }, begin) => {
    if (!line || file !== show.file) return;

    show.dips.push(begin);
    const statement = show.last;
    if (!statement) return;
    statement.waits
      .filter((at) => view.lines.get(at) === `waiting`)
      .forEach((at) => view.lines.delete(at));
    statement.lines
      .filter((at) => at > line)
      .forEach((at) => view.lines.delete(at));
  };

  const play = (item, begin) => {
    if (item.kind === `world` || item.kind === `change`) onWorld(item.world);
    if (item.kind === `step`) light(item.n);
    if (item.kind === `find`) find(item, begin);
    if (item.kind === `error`) {
      fail(item.error, begin);
      onError(item.error);
    }
    if (item.kind === `halt`) onHalt();
    if (item.kind === `done`) show.done = true;
  };

  // Сколько длится шаг в медленном показе. Пока не начался твой файл
  // (до первой метки идут решённые файлы станции), всё мгновенно.
  const pace = (item) => {
    if (!show.stepped) return 0;
    if (item.kind === `step`) return STEP;
    if (item.kind === `change`) return CHANGE;
    if (item.kind !== `find` || item.file !== show.file) return 0;
    return item.count ? PULSE.run + PULSE.hold : PULSE.run + MISS;
  };

  const finish = () => {
    view.slow = false;
    if (show.wasSlow && show.stepped) onSlowShown();
    show.finished = true;
  };

  const update = (now) => {
    if (show) {
      while (show.queue.length && show.at <= now) {
        const item = show.queue.shift();
        const begin = show.at;
        play(item, begin);
        show.at = begin + (show.slow ? pace(item) : 0);
      }
      // Запись пришла позже, чем показ до неё дошёл, — играем с этой минуты.
      show.at = Math.max(show.at, now);
      view.dip = dipAt(show.dips, now);
    }

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

    const over = show?.done && !show.queue.length && now >= show.at;
    if (over && !show.finished) finish();
  };

  return {
    view,
    update,

    start: ({ slow, dip, marked, file }, now = performance.now()) => {
      show = {
        slow,
        wasSlow: slow,
        dips: dip ? [now] : [],
        marked,
        file,
        queue: [],
        started: now,
        at: now + (dip ? DIP : slow ? LEAD : 0),
        stepped: false,
        last: null,
        done: false,
        finished: false,
      };
      view.lines.clear();
      view.bright.clear();
      view.pulses = [];
      view.kept = [];
      view.loose = null;
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
      show.dips = [];
      show.at = now;
      view.slow = false;
      if (view.loose) view.loose.run = 0;
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
