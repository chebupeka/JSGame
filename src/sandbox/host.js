// Песочница со стороны игры. Комната и код игрока живут в iframe на другом
// origin: код игрока работает с настоящим DOM, но до игры не дотянется.
// Каждый запуск — новый iframe, то есть чистая страница, как после F5.
// Рядом всегда прогрет второй iframe — для превью: в нём только чистая
// станция и уже решённые файлы, код игрока туда не попадает никогда.
// Цикл прерывает сторож в самой песочнице через 0,8 с. Пульс — запасная
// защита для зависаний без цикла, поэтому ждёт дольше.
const PULSE_TIMEOUT = 1500;
// Пульс пропал дольше этого — код занят, мир на экране застывает.
const STALL = 350;
const LOAD_TIMEOUT = 5000;
const QUERY_TIMEOUT = 1000;

// Первый хост — 127.0.0.1. Если песочница зависла, следующий запуск идёт
// на run-1.localhost, потом run-2… Каждое имя — отдельный сайт, значит,
// и отдельный процесс браузера: зависший старый не мешает новому.
const sandboxOrigin = (index) => {
  const { protocol, port } = location;
  const host = index === 0 ? `127.0.0.1` : `run-${index}.localhost`;
  return `${protocol}//${host}:${port}`;
};

// Один iframe с агентом: рукопожатие, канал сообщений и сторож по пульсу.
const launch = ({
  origin,
  container,
  hello,
  messages,
  onHang,
  onStall = () => {},
}) => {
  const iframe = document.createElement(`iframe`);
  iframe.setAttribute(`sandbox`, `allow-scripts allow-same-origin`);
  iframe.title = `песочница`;
  iframe.src = `${origin}/run/index.html`;

  let port = null;
  let lastPulse = performance.now();
  let stalled = false;
  const queue = [];

  const setStalled = (value) => {
    if (stalled === value) return;
    stalled = value;
    onStall(value);
  };

  const handlers = {
    ...messages,
    pulse: () => {
      lastPulse = performance.now();
      setStalled(false);
    },
  };

  const onReady = (event) => {
    if (event.source !== iframe.contentWindow || event.origin !== origin) {
      return;
    }
    if (event.data?.type !== `ready` || port) return;

    const channel = new MessageChannel();
    port = channel.port1;
    port.onmessage = ({ data }) => handlers[data?.type]?.(data);
    iframe.contentWindow.postMessage({ type: `hello`, ...hello }, origin, [
      channel.port2,
    ]);
    queue.splice(0).forEach((message) => port.postMessage(message));
    lastPulse = performance.now();
  };
  addEventListener(`message`, onReady);

  // В фоновой вкладке браузер притормаживает таймеры и игры, и песочницы:
  // редкий пульс там не значит, что код завис. Судим только на виду.
  const forgive = () => {
    lastPulse = performance.now();
  };
  document.addEventListener(`visibilitychange`, forgive);

  const stop = () => {
    clearInterval(watchdog);
    document.removeEventListener(`visibilitychange`, forgive);
    removeEventListener(`message`, onReady);
    port?.close();
    iframe.remove();
  };

  const watchdog = setInterval(() => {
    if (document.hidden) return forgive();

    const quiet = performance.now() - lastPulse;
    if (port && quiet > STALL) setStalled(true);
    if (quiet < (port ? PULSE_TIMEOUT : LOAD_TIMEOUT)) return;

    stop();
    setStalled(false);
    onHang();
  }, 250);

  container.replaceChildren(iframe);

  return {
    stop,
    post: (message) => (port ? port.postMessage(message) : queue.push(message)),
  };
};

export const createSandbox = ({
  worldContainer,
  previewContainer,
  room,
  things,
  solvedFiles,
  view,
  onSnapshot,
  onTrace,
  onError,
  onDone,
  onHalt,
  onStall,
  onHang,
}) => {
  let index = 0;
  let world = null;
  let preview = null;
  let lastQuery = 0;
  const waiting = new Map();

  const startPreview = () => {
    preview?.stop();
    preview = launch({
      origin: sandboxOrigin(index),
      container: previewContainer,
      hello: { room, things, files: solvedFiles(), view: view() },
      messages: {
        matches: ({ id, results }) => {
          waiting.get(id)?.(results);
          waiting.delete(id);
        },
      },
      // Зависнуть сам превью не может: в нём нет кода игрока. Значит,
      // завис процесс хоста — переезжаем на новый вместе с миром.
      onHang: () => {
        index += 1;
        startPreview();
      },
    });
  };

  // Зависший мир держит весь процесс своего хоста, а с ним и превью на том
  // же хосте. Поэтому после зависания переезжают оба.
  const worldHung = () => {
    world = null;
    index += 1;
    startPreview();
    onHang();
  };

  const run = (files) => {
    world?.stop();
    world = launch({
      origin: sandboxOrigin(index),
      container: worldContainer,
      // Мир записывает, что делает код игрока, — для показа по шагам.
      hello: { room, things, files, view: view(), trace: true },
      messages: {
        snapshot: ({ world }) => onSnapshot(world),
        trace: ({ event }) => onTrace(event),
        error: (error) => onError(error),
        halt: () => onHalt(),
        done: () => onDone(),
      },
      onHang: worldHung,
      onStall,
    });
  };

  // Спросить у прогретой комнаты, что находят селекторы. Только чтение.
  // Не ответила за секунду — null: превью честно ничего не покажет.
  const query = (selectors) =>
    new Promise((resolve) => {
      const id = ++lastQuery;
      waiting.set(id, resolve);
      preview.post({ type: `query`, id, selectors });
      setTimeout(() => waiting.delete(id) && resolve(null), QUERY_TIMEOUT);
    });

  startPreview();
  // Другое место — другие решённые файлы и другая прокрутка: превью
  // прогревается заново.
  // Действие с вещью в мире на экране (повернуть ручку). В превью — нет.
  const act = (message) => world?.post({ type: `act`, ...message });

  return { run, query, act, refresh: startPreview };
};
