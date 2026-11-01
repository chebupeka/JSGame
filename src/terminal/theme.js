import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

const px = (variable) => `calc(var(${variable}) * var(--u) * 1px)`;

// Подсветка только яркостью (MECHANICS.md §8): мел, белые ключевые слова,
// серые комментарии. Синий в коде будет значить то же, что в мире.
const brightness = HighlightStyle.define([
  {
    tag: [
      tags.keyword,
      tags.controlKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
      tags.operatorKeyword,
      tags.modifier,
      tags.function(tags.punctuation),
    ],
    color: `var(--keyword)`,
  },
  { tag: tags.comment, color: `var(--comment)` },
]);

const look = EditorView.theme(
  {
    "&": {
      height: `100%`,
      color: `var(--chalk)`,
      backgroundColor: `transparent`,
      fontSize: px(`--code-font`),
    },
    "&.cm-focused": { outline: `none` },
    ".cm-scroller": {
      fontFamily: `"JetBrains Mono", monospace`,
      fontVariantLigatures: `none`,
      fontFeatureSettings: `"liga" 0, "calt" 0`,
      lineHeight: px(`--code-line`),
      scrollbarWidth: `none`,
    },
    ".cm-content": { padding: `0`, caretColor: `var(--chalk)` },
    ".cm-line": { padding: `0` },
    ".cm-cursor": {
      borderLeft: `calc(var(--u) * 0.5px) solid var(--chalk)`,
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      background: `#343638`,
    },
    ".cm-gutters": {
      backgroundColor: `transparent`,
      border: `none`,
      color: `var(--comment)`,
    },
    ".cm-lineNumbers": { width: px(`--gutter`) },
    ".cm-lineNumbers .cm-gutterElement": {
      minWidth: `0`,
      padding: `0 calc(var(--u) * 2px) 0 0`,
      boxSizing: `border-box`,
    },
  },
  { dark: true },
);

export const terminalTheme = [look, syntaxHighlighting(brightness)];
