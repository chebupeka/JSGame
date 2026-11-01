// Раскладка кадра в пикселях сцены. Шрифт тоже в пикселях сцены, поэтому
// на ×4, ×5 и ×6 всё стоит на тех же местах, меняется только чёткость.
// Знак JetBrains Mono шириной 0,6 em: при шрифте 3,5 это 2,1 пикселя сцены,
// и 60 колонок кода — ровно 126.
//
// Стекло по ширине (крупный вариант): отступ 2 | кромка выполненных строк 1 |
// номера строк 7 | код 126 | щель 5 с пунктиром | поля 56 | отступ 3 = 200.
export const LAYOUTS = {
  large: {
    name: `крупный`,
    sprite: true,
    body: { x: 0, y: 108, w: 224, h: 72 },
    edge: { x: 0, y: 108, w: 224, h: 9 },
    glass: { x: 12, y: 117, w: 200, h: 63 },
    trace: { x: 14, y: 119, w: 1, h: 60 },
    code: { x: 15, y: 119, w: 133, h: 60 },
    divider: { x: 150, y: 118, w: 1, h: 62 },
    notes: { x: 153, y: 119, w: 56, h: 60 },
    nameplate: { x: 5, y: 109, w: 40, h: 7 },
    socket: { x: 213, y: 110 },
    lever: { x: 230, y: 120, w: 16, h: 32 },
    floor: { y: 78, h: 28 },
    gutter: 7,
    codeFont: 3.5,
    codeLine: 5,
    notesFont: 3,
    notesLine: 4,
    plateFont: 2.5,
  },

  // Код 12 px при ×4, зато комнаты видно больше.
  compact: {
    name: `компактный`,
    body: { x: 0, y: 122, w: 188, h: 58 },
    edge: { x: 0, y: 122, w: 188, h: 6 },
    glass: { x: 10, y: 128, w: 172, h: 52 },
    trace: { x: 12, y: 130, w: 1, h: 48 },
    code: { x: 13, y: 130, w: 114, h: 48 },
    divider: { x: 129, y: 129, w: 1, h: 51 },
    notes: { x: 131, y: 130, w: 48, h: 48 },
    nameplate: { x: 5, y: 122, w: 40, h: 6 },
    socket: { x: 178, y: 123 },
    lever: { x: 194, y: 134, w: 16, h: 32 },
    floor: { y: 78, h: 44 },
    gutter: 6,
    codeFont: 3,
    codeLine: 4,
    notesFont: 2.5,
    notesLine: 3.5,
    plateFont: 2.5,
  },
};

const place = (element, { x, y, w, h }) => {
  element.style.setProperty(`--x`, x);
  element.style.setProperty(`--y`, y);
  element.style.setProperty(`--w`, w);
  element.style.setProperty(`--h`, h);
};

export const applyLayout = (layout) => {
  const { style } = document.documentElement;

  style.setProperty(`--gutter`, layout.gutter);
  style.setProperty(`--code-font`, layout.codeFont);
  style.setProperty(`--code-line`, layout.codeLine);
  style.setProperty(`--notes-font`, layout.notesFont);
  style.setProperty(`--notes-line`, layout.notesLine);
  style.setProperty(`--plate-font`, layout.plateFont);

  place(document.querySelector(`#code`), layout.code);
  place(document.querySelector(`#notes`), layout.notes);
  place(document.querySelector(`#nameplate`), layout.nameplate);
};
