import { setMarks } from "../terminal/marks.js";
import { findQueries } from "./preview.js";

const PAUSE = 150;

// Превью, пока игрок печатает: после паузы разбираем код (не выполняя его)
// и спрашиваем у прогретой комнаты, что находят закрытые селекторы.
// Нашлось — отметка и призрачный провод к первой вещи по разметке.
export const createLivePreview = ({ editor, query, onWires }) => {
  let timer = null;
  let version = 0;
  let wires = [];

  const publish = (next) => {
    wires = next;
    onWires(wires);
  };

  const analyze = async () => {
    const mine = version;
    const queries = findQueries(editor.state.doc.toString());
    const checks = queries.filter(({ status }) => status === `check`);
    const results = checks.length
      ? await query(checks.map(({ selector }) => selector))
      : [];

    // Пока ждали ответа, код поменялся — этот разбор уже не про него.
    if (mine !== version) return;

    const marks = [];
    const next = [];
    queries.forEach((item) => {
      if (item.status === `unknown`) {
        marks.push({ kind: `unknown`, from: item.from, to: item.to });
        return;
      }

      // Комната не ответила: про этот селектор молчим, а не гадаем.
      if (results === null) return;

      const result = results[checks.indexOf(item)];
      if (!result?.count) {
        marks.push({ kind: `missing`, from: item.from, to: item.to });
        return;
      }

      marks.push({ kind: `found`, from: item.from, to: item.to });
      const [target, ...others] = result.rects;
      next.push({
        from: item.from,
        to: item.to,
        repeat: item.repeat,
        key: result.keys[0],
        target,
        others: item.all ? [] : others,
        all: item.all ? result.rects : [],
      });
    });

    editor.dispatch({ effects: setMarks.of(marks) });
    publish(next);
  };

  const schedule = () => {
    version += 1;
    clearTimeout(timer);
    timer = setTimeout(analyze, PAUSE);
  };

  // Провод, к которому относится задетый правкой селектор, исчезает сразу.
  const onChange = ({ changes }) => {
    publish(
      wires
        .filter(({ from, to }) => !changes.touchesRange(from, to))
        .map((wire) => ({
          ...wire,
          from: changes.mapPos(wire.from),
          to: changes.mapPos(wire.to),
        })),
    );
    schedule();
  };

  return { onChange, schedule };
};
