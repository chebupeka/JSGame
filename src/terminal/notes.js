// Поля терминала. Одна мысль, не больше трёх коротких фраз: сначала смысл
// обычными словами, потом настоящий термин (MECHANICS.md §2).
const notes = document.querySelector(`#notes`);

const paragraph = (text, className) => {
  const p = document.createElement(`p`);
  p.textContent = text;
  if (className) p.className = className;
  return p;
};

// Текст как в консоли или в F12: дословно, прямым мелом.
export const rawNote = (text) => paragraph(text, `raw`);

// Пометки — строки или готовые узлы (разбор ошибки).
export const showNotes = (...items) => {
  notes.replaceChildren(
    ...items.map((item) => (typeof item === `string` ? paragraph(item) : item)),
  );
};

// Разбор ошибки: текст браузера дословно, «строка N» (щелчок ставит туда
// курсор), части с объяснением и фраза по-русски.
export const errorNotes = ({ text, line, parts, sentences }, onJump) => {
  const nodes = [rawNote(text)];

  if (line) {
    const jump = paragraph(`строка ${line}`, `jump`);
    jump.addEventListener(`click`, (event) => {
      event.stopPropagation();
      onJump();
    });
    nodes.push(jump);
  }

  if (parts.length) {
    const list = document.createElement(`ul`);
    list.className = `parts`;
    parts.forEach(([term, meaning]) => {
      const item = document.createElement(`li`);
      const code = document.createElement(`code`);
      code.textContent = term;
      item.append(code, ` — ${meaning}`);
      list.append(item);
    });
    nodes.push(list);
  }

  sentences.forEach((sentence) => nodes.push(paragraph(sentence)));
  return nodes;
};
