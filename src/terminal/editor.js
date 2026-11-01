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

import { marksField, marksTheme, notchField } from "./marks.js";
import { terminalTheme } from "./theme.js";

// Редактор без basicSetup: нет автоскобок, автодополнения и подчёркиваний.
// Новичок печатает каждый символ сам. Tab — отступ в 2 пробела; набранная
// `}` встаёт на отступ своего блока (ничего не вставляет, только сдвигает).
// Возвращает сам редактор и load(doc) — открыть другой файл с чистой
// историей правок: Ctrl+Z не вернёт в прошлую задачу.
export const createEditor = (parent, doc, { onRun, onChange }) => {
  const extensions = [
    history(),
    lineNumbers(),
    drawSelection(),
    javascript(),
    indentOnInput(),
    indentUnit.of(`  `),
    EditorState.tabSize.of(2),
    // Ctrl+Enter — запуск, Shift+Ctrl+Enter — запуск с медленным
    // показом. Без Prec.highest CodeMirror вставил бы строку.
    Prec.highest(
      keymap.of([
        {
          key: `Mod-Enter`,
          run: () => {
            onRun({ slow: false });
            return true;
          },
          shift: () => {
            onRun({ slow: true });
            return true;
          },
        },
      ]),
    ),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    terminalTheme,
    marksField,
    marksTheme,
    notchField,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange(update);
    }),
  ];
  const stateOf = (text) =>
    EditorState.create({
      doc: text,
      selection: { anchor: text.length },
      extensions,
    });

  const view = new EditorView({ parent, state: stateOf(doc) });
  view.focus();
  return { view, load: (text) => view.setState(stateOf(text)) };
};
