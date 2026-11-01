import backgroundUrl from "../../assets/sprites/bg-switchroom.png";
import lampUrl from "../../assets/sprites/lamp.png";
import terminalUrl from "../../assets/sprites/terminal.png";
import { grey } from "./palette.js";

// Её листы кадров: girl-stand.png, girl-walk.png… Пока их нет, игра
// рисует силуэт, поэтому они подключаются по маске, а не обязательным импортом.
const GIRL_SHEETS = import.meta.glob(`../../assets/sprites/girl-*.png`, {
  eager: true,
  query: `?url`,
  import: `default`,
});

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

const hex = (r, g, b) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, `0`)).join(``)}`.toUpperCase();

// Тот же спрайт, где каждый серый на ступень темнее: так она растворяется
// в тёмном дверном проёме, не выходя из палитры.
const darker = (image) => {
  const canvas = document.createElement(`canvas`);
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext(`2d`, { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = pixels;
  for (let i = 0; i < data.length; i += 4) {
    const step = grey.indexOf(hex(data[i], data[i + 1], data[i + 2]));
    if (data[i + 3] === 0 || step < 1) continue;

    const [r, g, b] = [1, 3, 5].map((at) =>
      parseInt(grey[step - 1].slice(at, at + 2), 16),
    );
    data.set([r, g, b], i);
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
};

const loadGirl = async () => {
  const entries = await Promise.all(
    Object.entries(GIRL_SHEETS).map(async ([path, url]) => [
      path.match(/girl-(\w+)\.png$/)[1],
      await load(url),
    ]),
  );
  if (!entries.length) return null;

  const sheets = Object.fromEntries(entries);
  sheets.dark = Object.fromEntries(
    entries.map(([action, image]) => [action, darker(image)]),
  );
  return sheets;
};

export const loadSprites = async () => {
  const [background, lamp, terminal, girl] = await Promise.all([
    load(backgroundUrl),
    load(lampUrl),
    load(terminalUrl),
    loadGirl(),
  ]);
  return { background, lamp, terminal, girl };
};

export const drawSprite = (ctx, image, x, y) =>
  ctx.drawImage(image, Math.round(x), Math.round(y));
