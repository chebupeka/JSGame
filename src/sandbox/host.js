// Песочница со стороны игры. Комната и код игрока живут в iframe на другом
// origin: код игрока работает с настоящим DOM, но до игры не дотянется.
// Каждый запуск — новый iframe, то есть чистая страница, как после F5.
const PULSE_TIMEOUT = 1000;
const LOAD_TIMEOUT = 5000;

// Первый хост — 127.0.0.1. Если песочница зависла, следующий запуск идёт
// на run-1.localhost, потом run-2… Каждое имя — отдельный сайт, значит,
// и отдельный процесс браузера: зависший старый не мешает новому.
const sandboxOrigin = (index) => {
  const { protocol, port } = location;
  const host = index === 0 ? `127.0.0.1` : `run-${index}.localhost`;
  return `${protocol}//${host}:${port}`;
};

export const createSandbox = ({
  container,
  room,
  things,
  onSnapshot,
  onError,
  onHang,
}) => {
  let index = 0;
  let current = null;

  const stop = () => {
    current?.stop();
    current = null;
  };

  const run = (files) => {
    stop();

    const origin = sandboxOrigin(index);
    const iframe = document.createElement(`iframe`);
    iframe.setAttribute(`sandbox`, `allow-scripts allow-same-origin`);
    iframe.title = `песочница`;
    iframe.src = `${origin}/run/index.html`;

    let port = null;
    let lastPulse = performance.now();

    const messages = {
      pulse: () => {
        lastPulse = performance.now();
      },
      snapshot: ({ room, things }) => onSnapshot({ room, things }),
      error: (error) => onError(error),
      done: () => {},
    };

    const onReady = (event) => {
      if (event.source !== iframe.contentWindow || event.origin !== origin) {
        return;
      }
      if (event.data?.type !== `ready` || port) return;

      const channel = new MessageChannel();
      port = channel.port1;
      port.onmessage = ({ data }) => messages[data?.type]?.(data);
      iframe.contentWindow.postMessage(
        { type: `hello`, room, things, files },
        origin,
        [channel.port2],
      );
      lastPulse = performance.now();
    };
    addEventListener(`message`, onReady);

    // В фоновой вкладке браузер притормаживает таймеры и игры, и песочницы:
    // редкий пульс там не значит, что код завис. Судим только на виду.
    const forgive = () => {
      lastPulse = performance.now();
    };
    document.addEventListener(`visibilitychange`, forgive);

    const watchdog = setInterval(() => {
      if (document.hidden) return forgive();

      const limit = port ? PULSE_TIMEOUT : LOAD_TIMEOUT;
      if (performance.now() - lastPulse < limit) return;

      stop();
      index += 1;
      onHang();
    }, 250);

    current = {
      stop: () => {
        clearInterval(watchdog);
        document.removeEventListener(`visibilitychange`, forgive);
        removeEventListener(`message`, onReady);
        port?.close();
        iframe.remove();
      },
    };
    container.replaceChildren(iframe);
  };

  return { run };
};
