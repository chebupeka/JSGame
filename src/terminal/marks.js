import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";

// Отметки превью на селекторах: нашлось — светло-синий текст, не нашлось —
// тонкие точки под строкой, неизвестно — пунктир («узнаем при запуске»).
export const setMarks = StateEffect.define();

const KINDS = {
  found: Decoration.mark({ class: `cm-found` }),
  missing: Decoration.mark({ class: `cm-missing` }),
  unknown: Decoration.mark({ class: `cm-unknown` }),
};

// Отметка, которую задела правка, исчезает сразу: стёр букву — синего нет.
// Новые отметки приходят после паузы в печати.
export const marksField = StateField.define({
  create: () => Decoration.none,
  update: (marks, transaction) => {
    let next = marks;
    if (transaction.docChanged) {
      next = next
        .update({
          filter: (from, to) => !transaction.changes.touchesRange(from, to),
        })
        .map(transaction.changes);
    }

    for (const effect of transaction.effects) {
      if (!effect.is(setMarks)) continue;
      next = Decoration.set(
        effect.value
          .filter(({ from, to }) => to > from)
          .map(({ kind, from, to }) => KINDS[kind].range(from, to)),
        true,
      );
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

export const marksTheme = EditorView.theme({
  ".cm-found": { color: `var(--found)` },
  ".cm-missing": {
    textDecoration: `underline dotted var(--comment)`,
    textUnderlineOffset: `calc(var(--u) * 1px)`,
  },
  ".cm-unknown": {
    textDecoration: `underline dashed var(--comment)`,
    textUnderlineOffset: `calc(var(--u) * 1px)`,
  },
});
