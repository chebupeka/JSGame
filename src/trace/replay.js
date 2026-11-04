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
const LISTEN = 500;
const PULSE = { run: 500, hold: 400, fade: 300 };
// После запуска события идут вживую: всё быстрее, чем в медленном показе.
const QUICK = 0.4;
const IMPULSE = 300;
const FLASH = 350;
// События чаще этого — тонкие линии вместо вспышек.
const FREQUENT = 120;

// Поиск в показе по шагам: пока он идёт, вещь в светлых уголках, а её
// табличка горит. quick — поиск внутри обработчика, когда событие пришло
// вживую.
export const pulseActive = ({ start, quick }, now) =>
  now >= start && now - start < (PULSE.run + PULSE.hold) * (quick ? QUICK : 1);

const pulseOver = ({ start, quick }, now) =>
  now - start >= (PULSE.run + PULSE.hold + PULSE.fade) * (quick ? QUICK : 1);

// Импульс события: бежит от датчика по кабелю к терминалу. t — докуда
// добежал (0 — у датчика), null — уже добежал.
export const impulseAt = ({ start }, now) => {
  const t = (now - start) / IMPULSE;
  return t < 0 || t >= 1 ? null : t;
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
  onSound = () => {},
  onFault = () => {},
  onFinish = () => {},
}) => {
  // Что рисуют терминал и сцена. Кромки и висящие провода остаются после
  // показа: кромки — до правки кода, провода — до следующего запуска.
  const view = {
    lines: new Map(),
    bright: new Set(),
    pulses: [],
    kept: [],
    // Датчики, которые повесил код: id → { key, rect, type, once, value }.
    sensors: new Map(),
    impulses: [],
    // Строки обработчика, которые вспыхнули на событии: строка → до когда.
    flashes: new Map(),
    dip: 0,
    slow: false,
  };
  let show = null;

  // Начатая инструкция: её строки горят, тела функций в ней ждут.
  // После запуска, на событии, строки обработчика только вспыхивают.
  const light = (n, begin) => {
    const statement = show.marked?.statements[n];
    if (!statement) return;
    // Код правили после запуска: строки сдвинулись, а обработчик в мире
    // ещё старый — вспышки легли бы не на те строки.
    if (show.finished) {
      if (show.edited) return;
      statement.lines.forEach((line) => view.flashes.set(line, begin + FLASH));
      return;
    }

    show.stepped = true;
    show.last = statement;
    statement.waits.forEach((line) => {
      if (!view.lines.has(line)) view.lines.set(line, `waiting`);
    });
    statement.lines.forEach((line) => view.lines.set(line, `lit`));
  };

  const find = (event, begin) => {
    if (event.file !== show.file) return;
    // Ничего не нашлось — нечему загораться: отметка в коде и разбор
    // ошибки скажут, что не так.
    if (!event.count) {
      if (show.slow) onPulse(null);
      return;
    }

    const call = show.marked?.callAt(event.line, event.column);
    const wire = { rects: event.rects, keys: event.keys, kept: !!call?.kept };
    // Поиск внутри обработчика, вживую: вещь на миг в светлых уголках.
    if (show.finished) {
      view.pulses.push({ ...wire, kept: false, start: begin, quick: true });
      return;
    }
    if (!show.slow) {
      if (wire.kept) view.kept.push(wire);
      return;
    }

    view.pulses.push({ ...wire, start: begin, lines: call?.lines ?? [] });
    onPulse(event.rects[0]);
    onFlash(event.keys, begin, begin + PULSE.run + PULSE.hold);
  };

  // Ошибка при выполнении: свет проседает, а у упавшей инструкции гаснут
  // строки ниже места ошибки и тела функций — туда код не дошёл.
  const fail = ({ file, line }, begin) => {
    if (!line || file !== show.file) return;

    show.dips.push(begin);
    // Ошибка выше начатой инструкции (в функции, объявленной раньше) —
    // строки самой инструкции не трогаем: она дошла, куда дошла.
    const statement = show.last;
    if (!statement || line < statement.line) return;
    statement.waits
      .filter((at) => view.lines.get(at) === `waiting`)
      .forEach((at) => view.lines.delete(at));
    statement.lines
      .filter((at) => at > line)
      .forEach((at) => view.lines.delete(at));
  };

  // Датчик: защёлкнулся на вещи, сработал на событие, снят.
  const sensorOf = ({ id }) => view.sensors.get(id);

  const listen = (event, begin) => {
    const { key, rect, type, id, once } = event;
    view.sensors.set(id, { key, rect, type, id, once, start: begin });
    onSound(`clamp`, rect);
  };

  const fire = (event, begin) => {
    const sensor = sensorOf(event);
    if (!sensor) return;
    const thin = begin - (show.lastEvent ?? -Infinity) < FREQUENT;
    show.lastEvent = begin;
    sensor.value = event.value;
    view.impulses.push({ id: sensor.id, start: begin, thin });
    if (sensor.once) sensor.gone = begin + IMPULSE;
    onSound(`tick`, sensor.rect);
  };

  const play = (item, begin) => {
    if (item.kind === `world` || item.kind === `change`) onWorld(item.world);
    if (item.kind === `step`) light(item.n, begin);
    if (item.kind === `find`) find(item, begin);
    if (item.kind === `listen`) listen(item, begin);
    if (item.kind === `unlisten`) view.sensors.delete(item.id);
    if (item.kind === `event`) fire(item, begin);
    if (item.kind === `fault`) onFault(item);
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
    if (item.kind === `listen`) return LISTEN;
    if (item.kind !== `find` || item.file !== show.file) return 0;
    return item.count ? PULSE.run + PULSE.hold : PULSE.run + MISS;
  };

  const finish = () => {
    // Дальше события идут вживую, без медленного шага.
    show.slow = false;
    view.slow = false;
    if (show.wasSlow && show.stepped) onSlowShown();
    show.finished = true;
    onFinish();
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
        .flatMap(({ lines = [] }) => lines),
    );
    view.impulses = view.impulses.filter(
      (pulse) => impulseAt(pulse, now) !== null || pulse.start > now,
    );
    view.flashes.forEach((until, line) => {
      if (now >= until) view.flashes.delete(line);
    });
    view.sensors.forEach((sensor, id) => {
      if (sensor.gone && now >= sensor.gone) view.sensors.delete(id);
    });

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
      view.sensors.clear();
      view.impulses = [];
      view.flashes.clear();
      view.dip = 0;
      view.slow = slow;
    },

    // Сообщение песочницы: снимок мира, шаг записи, ошибка или конец.
    // Без медленного показа оно играет сразу, не дожидаясь кадра.
    receive: (item) => {
      if (!show) return;
      // Очередь была пуста — запись пришла сейчас, с этой минуты и играем
      // (а не с последнего кадра: в фоне кадры редки).
      const now = performance.now();
      if (!show.queue.length) show.at = Math.max(show.at, now);
      show.queue.push(item);
      if (!show.slow) update(now);
    },

    // Любая клавиша: всё, что осталось, — сразу.
    skip: () => {
      if (!show?.slow) return;
      const now = performance.now();
      show.slow = false;
      show.dips = [];
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
      view.flashes.clear();
      if (show) show.edited = true;
    },
  };
};
