import { SCENE } from "../screen/scale.js";
import { blue, blueGlow, blueLight, grey } from "./palette.js";
import { dot } from "./pixels.js";

// Датчик-зажим 8×10 из маски (MECHANICS.md §3.2): сверху гнездо с лампой,
// снизу зажим, которым он держится за вещь. Он синий — его повесил код
// игрока. Контур сплошной, смысл — в цвете: `ghost` — задуман, пока
// печатаешь (тусклый синий), `wait` — защёлкнут и ждёт (синий), `fire` —
// сработал на событие (светлый).
//   s — гнездо, L — лампа, # — зажим.
const MASK = [
  `..ssss..`,
  `..sLLs..`,
  `...ss...`,
  `.######.`,
  `.#....#.`,
  `##....##`,
  `#......#`,
  `##....##`,
  `.#....#.`,
  `.######.`,
];

const BODY = { ghost: blueGlow, wait: blue, fire: blueLight };

export const SENSOR = { w: 8, h: 10 };

// Рамка вещи под датчиком. Запись бывает 0×0 (песочница ещё без размера) —
// тогда берём рамку вещи из последнего снимка. null — рисовать негде: нет
// рамки или вещь не в этой комнате (лампа щитовой из комнаты с окном).
export const sensorRect = ({ rect, key }, world) => {
  const found = rect?.width > 0 ? rect : world?.things[key]?.rect;
  if (!(found?.width > 0)) return null;
  const { x, y, width, height } = found;
  const outside =
    x + width <= 0 || y + height <= 0 || x >= SCENE.width || y >= SCENE.height;
  return outside ? null : found;
};

// Где датчик на вещи: зажат на её верхней кромке, ближе к правому краю.
// inside — внутри вещи: над ней что-то висит, и кромка занята (плата ручки).
export const sensorSpot = ({ x, y, width }, inside = false) => ({
  x: Math.round(x + width - SENSOR.w - 2),
  y: inside ? Math.round(y) + 1 : Math.max(0, Math.round(y - SENSOR.h + 3)),
});

// Датчики в кадре и где каждый висит. Несколько на одной вещи — рядком,
// а не друг на друге. things — манифест вещей места. Датчики решённых файлов
// (не openFile) уже знакомы: от них остаётся только лампа, зажим рисовать
// незачем, иначе на полке с шестью ящиками их не сосчитать.
export const placeSensors = (sensors, world, things, openFile = null) => {
  const taken = new Map();
  const small = new Map();
  return [...sensors].flatMap((sensor) => {
    const rect = sensorRect(sensor, world);
    if (!rect) return [];
    const inside = things.find(({ key }) => key === sensor.key)?.sensorInside;
    const spot = sensorSpot(rect, inside);
    const place = `${spot.x} ${spot.y}`;
    const tiny = !!openFile && !!sensor.file && sensor.file !== openFile;
    const counts = tiny ? small : taken;
    const count = counts.get(place) ?? 0;
    counts.set(place, count + 1);
    return [
      {
        sensor,
        tiny,
        spot: tiny
          ? { x: spot.x + SENSOR.w - 2 - count * 3, y: spot.y + 5 }
          : { x: spot.x - count * (SENSOR.w + 1), y: spot.y },
      },
    ];
  });
};

// Лампа датчика решённого файла: две точки на вещи.
export const drawSensorLamp = (ctx, { x, y }, firing) => {
  const color = firing ? blueLight : blue;
  dot(ctx, color, x, y);
  dot(ctx, color, x + 1, y);
};

// kind: `lit` — вещь шлёт это событие, лампа горит; `dark` — событие
// бывает, но эта вещь его не шлёт; `none` — такого события нет, гнезда нет.
// blink — лампа медленно мигает: датчик ждёт.
export const drawSensor = (ctx, spot, { kind, state, blink = true }) => {
  const body = BODY[state];
  MASK.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === `.`) return;
      if (kind === `none` && (cell === `s` || cell === `L`)) return;

      const lamp = kind === `lit` ? (blink ? blueLight : blueGlow) : grey[2];
      dot(ctx, cell === `L` ? lamp : body, spot.x + x, spot.y + y);
    });
  });
};

// Где у датчика выход кабеля к терминалу — снизу, по центру.
export const sensorPort = (spot) => [
  spot.x + SENSOR.w / 2,
  spot.y + SENSOR.h - 1,
];
