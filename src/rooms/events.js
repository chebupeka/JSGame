// Какие события вообще бывают. Призрачный датчик, пока печатаешь
// (MECHANICS.md §3.1): «гнезда нет» — только если такого имени нет ни здесь,
// ни среди свойств on… у элементов этого браузера. Иначе — гнездо есть,
// а лампа датчика горит, только если сама вещь шлёт это событие (таблица
// events у вещей комнаты). Регистр важен: `Input` — не `input`.
const KNOWN = new Set([
  `abort`,
  `animationcancel`,
  `animationend`,
  `animationiteration`,
  `animationstart`,
  `beforeinput`,
  `beforetoggle`,
  `blur`,
  `change`,
  `click`,
  `compositionend`,
  `compositionstart`,
  `compositionupdate`,
  `contextmenu`,
  `copy`,
  `cut`,
  `dblclick`,
  `DOMContentLoaded`,
  `drag`,
  `dragend`,
  `dragenter`,
  `dragleave`,
  `dragover`,
  `dragstart`,
  `drop`,
  `error`,
  `focus`,
  `focusin`,
  `focusout`,
  `hashchange`,
  `input`,
  `invalid`,
  `keydown`,
  `keypress`,
  `keyup`,
  `load`,
  `message`,
  `mousedown`,
  `mouseenter`,
  `mouseleave`,
  `mousemove`,
  `mouseout`,
  `mouseover`,
  `mouseup`,
  `offline`,
  `online`,
  `paste`,
  `pointercancel`,
  `pointerdown`,
  `pointerenter`,
  `pointerleave`,
  `pointermove`,
  `pointerout`,
  `pointerover`,
  `pointerup`,
  `popstate`,
  `reset`,
  `resize`,
  `scroll`,
  `scrollend`,
  `select`,
  `selectionchange`,
  `storage`,
  `submit`,
  `toggle`,
  `touchcancel`,
  `touchend`,
  `touchmove`,
  `touchstart`,
  `transitioncancel`,
  `transitionend`,
  `transitionrun`,
  `transitionstart`,
  `visibilitychange`,
  `wheel`,
]);

// Есть ли у датчика гнездо: бывает ли такое событие.
export const socketOf = (type) =>
  KNOWN.has(type) ||
  (typeof HTMLElement !== `undefined` &&
    /^[a-z]+$/.test(type) &&
    `on${type}` in HTMLElement.prototype);

// Каким будет датчик на вещи: `lit` — вещь шлёт это событие, `dark` —
// событие бывает, но эта вещь его не шлёт, `none` — гнезда нет.
export const sensorKind = (type, thing) => {
  if (!socketOf(type)) return `none`;
  return thing?.events?.includes(type) ? `lit` : `dark`;
};
