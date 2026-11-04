import { setMarks } from "../terminal/marks.js";
import { findListeners, findQueries } from "./preview.js";

const PAUSE = 150;

// Превью, пока игрок печатает: после паузы разбираем код (не выполняя его)
// и спрашиваем у прогретой комнаты, что находят закрытые селекторы.
// Нашлось — отметка и призрачный провод к первой вещи по разметке.
// Датчик на найденной вещи — призрачный датчик (onSensors).
export const createLivePreview = ({
  editor,
  query,
  onWires,
  onSensors = () => {},
}) => {
  let timer = null;
  let version = 0;
  let wires = [];

  const publish = (next) => {
    wires = next;
    onWires(wires);
  };

  const analyze = async () => {
    const mine = version;
    const code = editor.state.doc.toString();
    const queries = findQueries(code);
    const listeners = findListeners(code);
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
        // querySelectorAll находит все — горят таблички всех найденных.
        keys: item.all ? result.keys : result.keys.slice(0, 1),
        target,
        others: item.all ? [] : others,
        all: item.all ? result.rects : [],
      });
    });

    editor.dispatch({ effects: setMarks.of(marks) });
    publish(next);

    // Датчик встаёт туда, куда ведёт поиск, на котором он висит.
    onSensors(
      listeners.flatMap((listener) => {
        const item = queries.find(
          ({ status, call }) =>
            status === `check` &&
            call.from === listener.on.from &&
            call.to === listener.on.to,
        );
        const result = item && results?.[checks.indexOf(item)];
        if (!result?.count) return [];
        return [
          {
            type: listener.type,
            key: result.keys[0],
            rect: result.rects[0],
            from: listener.from,
            to: listener.to,
          },
        ];
      }),
    );
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
