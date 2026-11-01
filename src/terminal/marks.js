import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";

// Засечка SyntaxError: тонкая черта в коде там, где чтение споткнулось.
// Красного нет нигде: засечка белая. Любая правка её убирает.
export const setNotch = StateEffect.define();

class Notch extends WidgetType {
  toDOM() {
    const notch = document.createElement(`span`);
    notch.className = `cm-notch`;
    return notch;
  }
}

export const notchField = StateField.define({
  create: () => Decoration.none,
  update: (notch, transaction) => {
    if (transaction.docChanged) return Decoration.none;
    for (const effect of transaction.effects) {
      if (!effect.is(setNotch)) continue;
      return effect.value === null
        ? Decoration.none
        : Decoration.set([
            Decoration.widget({ widget: new Notch(), side: 1 }).range(
              effect.value,
            ),
          ]);
    }
    return notch;
  },
  provide: (field) => EditorView.decorations.from(field),
});

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
  ".cm-notch": {
    display: `inline-block`,
    width: `0`,
    height: `calc(var(--code-line) * var(--u) * 1px)`,
    marginRight: `calc(var(--u) * -0.5px)`,
    borderLeft: `calc(var(--u) * 0.5px) solid var(--keyword)`,
    verticalAlign: `top`,
  },
});
