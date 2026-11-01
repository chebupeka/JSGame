export const SCENE = { width: 320, height: 180 };

// Целый множитель: сколько физических пикселей экрана приходится на один
// пиксель сцены. С дробным множителем пиксели расплылись бы. Считаем
// в физических пикселях, чтобы масштаб Windows 125 % и зум браузера
// не ломали сетку. x и y — сдвиг кадра от угла окна, тоже целый.
export const computeFrame = ({ width, height, dpr }) => {
  const screenWidth = Math.round(width * dpr);
  const screenHeight = Math.round(height * dpr);
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

// Пересчитывает кадр при изменении окна и при смене плотности пикселей
// (перетащили окно на другой монитор, поменяли зум).
export const watchFrame = (onChange) => {
  let media;

  const update = () => {
    media?.removeEventListener(`change`, update);
    media = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    media.addEventListener(`change`, update);

    onChange(
      computeFrame({
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
      }),
    );
  };

  addEventListener(`resize`, update);
  update();
};
