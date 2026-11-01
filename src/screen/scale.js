export const SCENE = { width: 320, height: 180 };

// Целый множитель: сколько физических пикселей экрана приходится на один
// пиксель сцены. С дробным множителем пиксели расплылись бы. Всё считаем
// в физических пикселях, чтобы масштаб Windows 125 % и зум браузера
// не ломали сетку. x и y — сдвиг кадра от угла окна, тоже целый.
export const computeFrame = ({ screenWidth, screenHeight, dpr }) => {
  const scale = Math.max(
    1,
    Math.floor(
      Math.min(screenWidth / SCENE.width, screenHeight / SCENE.height),
    ),
  );

  return {
    scale,
    dpr,
    x: Math.floor((screenWidth - SCENE.width * scale) / 2),
    y: Math.floor((screenHeight - SCENE.height * scale) / 2),
  };
};

export const applyFrame = (element, { scale, dpr, x, y }) => {
  document.documentElement.style.setProperty(`--u`, scale / dpr);
  Object.assign(element.style, {
    left: `${x / dpr}px`,
    top: `${y / dpr}px`,
    width: `${(SCENE.width * scale) / dpr}px`,
    height: `${(SCENE.height * scale) / dpr}px`,
  });
};

// Размер окна в физических пикселях меряем точно (device-pixel-content-box).
// innerWidth целый, и при дробном dpr его произведение врёт на пиксель,
// а с ним и множитель. Наблюдатель срабатывает и при смене dpr (зум, окно
// на другом мониторе). Где точного размера нет (Safari), считаем по innerWidth.
export const watchFrame = (onChange) => {
  const observer = new ResizeObserver(([entry]) => {
    const dpr = devicePixelRatio;
    const exact = entry.devicePixelContentBoxSize?.[0];

    onChange(
      computeFrame({
        screenWidth: exact?.inlineSize ?? Math.round(innerWidth * dpr),
        screenHeight: exact?.blockSize ?? Math.round(innerHeight * dpr),
        dpr,
      }),
    );
  });

  try {
    observer.observe(document.documentElement, {
      box: `device-pixel-content-box`,
    });
  } catch {
    observer.observe(document.documentElement);
  }
};
