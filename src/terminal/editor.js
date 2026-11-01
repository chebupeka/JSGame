import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { indentUnit } from "@codemirror/language";
import { EditorState, Prec } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  keymap,
  lineNumbers,
} from "@codemirror/view";

import { terminalTheme } from "./theme.js";

// Редактор без basicSetup: нет автоскобок, автодополнения и подчёркиваний.
// Новичок печатает каждый символ сам. Tab — отступ в 2 пробела.
export const createEditor = (parent, doc) => {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [
        history(),
        lineNumbers(),
        drawSelection(),
        javascript(),
        indentUnit.of(`  `),
        EditorState.tabSize.of(2),
        // Ctrl+Enter — запуск (этап 2). Пока занят, чтобы не вставлял строку.
        Prec.highest(keymap.of([{ key: `Mod-Enter`, run: () => true }])),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        terminalTheme,
      ],
    }),
  });

  view.focus();
  return view;
};
