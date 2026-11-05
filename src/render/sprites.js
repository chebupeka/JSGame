import archiveUrl from "../../assets/sprites/bg-archive.png";
import frameRoomUrl from "../../assets/sprites/bg-frame-room.png";
import backgroundUrl from "../../assets/sprites/bg-switchroom.png";
import breakerUrl from "../../assets/sprites/breaker.png";
import drawerUrl from "../../assets/sprites/drawer.png";
import frameBigUrl from "../../assets/sprites/frame-big.png";
import frameSmallUrl from "../../assets/sprites/frame-small.png";
import knobUrl from "../../assets/sprites/knob.png";
import lampUrl from "../../assets/sprites/lamp.png";
import leverUrl from "../../assets/sprites/lever.png";
import shelfUrl from "../../assets/sprites/shelf.png";
import tableUrl from "../../assets/sprites/table.png";
import terminalUrl from "../../assets/sprites/terminal.png";
import { blueGlow, grey } from "./palette.js";

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

// Тот же спрайт, перекрашенный по таблице «цвет → цвет» внутри палитры.
const recolor = (image, table) => {
  const canvas = document.createElement(`canvas`);
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext(`2d`, { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = pixels;
  for (let i = 0; i < data.length; i += 4) {
    const target = table[hex(data[i], data[i + 1], data[i + 2])];
    if (data[i + 3] === 0 || !target) continue;

    data.set(
      [1, 3, 5].map((at) => parseInt(target.slice(at, at + 2), 16)),
      i,
    );
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
};

// Каждый серый на ступень темнее: так она растворяется в тёмном дверном
// проёме, не выходя из палитры.
const DARKER = Object.fromEntries(grey.slice(1).map((c, i) => [c, grey[i]]));

// В синем свете лампы её светлая кромка ловит синий отсвет на сером.
const LIT = { [grey[3]]: blueGlow, [grey[4]]: blueGlow };

const variants = (entries, table) =>
  Object.fromEntries(
    entries.map(([action, image]) => [action, recolor(image, table)]),
  );

const loadGirl = async () => {
  const entries = await Promise.all(
    Object.entries(GIRL_SHEETS).map(async ([path, url]) => [
      path.match(/girl-(\w+)\.png$/)[1],
      await load(url),
    ]),
  );
  if (!entries.length) return null;

  return {
    ...Object.fromEntries(entries),
    dark: variants(entries, DARKER),
    lit: variants(entries, LIT),
  };
};

// Комната с фальш-окном: фон, рамы окон и плата ручки.
const loadFrameRoom = async () => {
  const [background, frameBig, frameSmall, knob] = await Promise.all(
    [frameRoomUrl, frameBigUrl, frameSmallUrl, knobUrl].map(load),
  );
  return { background, frameBig, frameSmall, knob };
};

// Архив: фон, полка, ящики и стол.
const loadArchive = async () => {
  const [background, shelf, drawer, table] = await Promise.all(
    [archiveUrl, shelfUrl, drawerUrl, tableUrl].map(load),
  );
  return { background, shelf, drawer, table };
};

export const loadSprites = async () => {
  const [background, lamp, terminal, lever, breaker, girl, frameRoom, archive] =
    await Promise.all([
      load(backgroundUrl),
      load(lampUrl),
      load(terminalUrl),
      load(leverUrl),
      load(breakerUrl),
      loadGirl(),
      loadFrameRoom(),
      loadArchive(),
    ]);
  return {
    background,
    lamp,
    terminal,
    lever,
    breaker,
    girl,
    frameRoom,
    archive,
  };
};

export const drawSprite = (ctx, image, x, y) =>
  ctx.drawImage(image, Math.round(x), Math.round(y));
