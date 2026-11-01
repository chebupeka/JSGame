import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { indentOnInput, indentUnit } from "@codemirror/language";
import { EditorState, Prec } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  keymap,
  lineNumbers,
} from "@codemirror/view";

import { marksField, marksTheme } from "./marks.js";
import { terminalTheme } from "./theme.js";

// Редактор без basicSetup: нет автоскобок, автодополнения и подчёркиваний.
// Новичок печатает каждый символ сам. Tab — отступ в 2 пробела; набранная
// `}` встаёт на отступ своего блока (ничего не вставляет, только сдвигает).
export const createEditor = (parent, doc, { onRun, onChange }) => {
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
        indentOnInput(),
        indentUnit.of(`  `),
        EditorState.tabSize.of(2),
        // Ctrl+Enter — запуск. Без Prec.highest CodeMirror вставил бы строку.
        Prec.highest(
          keymap.of([
            {
              key: `Mod-Enter`,
              run: () => {
                onRun();
                return true;
              },
            },
          ]),
        ),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        terminalTheme,
        marksField,
        marksTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update);
        }),
      ],
    }),
  });

  view.focus();
  return view;
};
