import backgroundUrl from "../../assets/sprites/bg-switchroom.png";
import lampUrl from "../../assets/sprites/lamp.png";
import terminalUrl from "../../assets/sprites/terminal.png";

// Спрайты из assets/sprites рисуются 1:1 по целым координатам, поэтому
// на холсте остаются ровно цвета палитры (их проверяет check_palette.py).
// onload, а не decode(): decode() в невидимой вкладке ждёт отрисовки,
// и игра не стартовала бы, пока вкладку не покажут.
const load = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Спрайт не загрузился: ${url}`));
    image.src = url;
  });

export const loadSprites = async () => {
  const [background, lamp, terminal] = await Promise.all(
    [backgroundUrl, lampUrl, terminalUrl].map(load),
  );
  return { background, lamp, terminal };
};

export const drawSprite = (ctx, image, x, y) =>
  ctx.drawImage(image, Math.round(x), Math.round(y));
