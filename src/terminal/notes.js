// Поля терминала. Одна мысль, не больше трёх коротких фраз: сначала смысл
// обычными словами, потом настоящий термин (MECHANICS.md §2).
const notes = document.querySelector(`#notes`);

export const showNotes = (...paragraphs) => {
  notes.replaceChildren(
    ...paragraphs.map((text) => {
      const p = document.createElement(`p`);
      p.textContent = text;
      return p;
    }),
  );
};
