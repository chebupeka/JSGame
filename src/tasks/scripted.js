import { goTo, placeGirl, settled } from "../girl/girl.js";

// Проверка-сценарий: она делает что-то по шагам, а между шагами смотрит
// на настоящий мир (MECHANICS.md §3.4). Сценарий — функция-генератор: yield
// ждёт, пока шаг кончится (дошла, прошло время, ответил проверочный запуск),
// и отдаёт его результат. Что она вернёт в конце:
//   true    — всё верно, она идёт в to, и когда дошла, задача решена;
//   строка  — пометка «почти», она стоит и ждёт;
//   `silent`— тихая ошибка без своей пометки;
//   false   — сказать нечего.
// before — что она делает до первого запуска (шаг 0): так видно, чего ей не
// хватает.
export const scripted =
  ({ from, to, script, before = null }) =>
  ({ girl, act, trial, onOutcome, onSound = () => {} }) => {
    let solved = false;
    let armed = false;
    let leaving = false;
    let done = false;
    let running = null;
    let status = {};

    const standAt = ({ at, pose }) =>
      placeGirl(girl, at, pose === `sit` ? `sat` : pose);

    const until = (check) => check;
    const helpers = {
      girl,
      world: () => status.world,
      code: () => status.code ?? ``,
      sensors: () => status.sensors ?? new Map(),
      finds: () => status.finds ?? 0,
      writes: () => status.writes ?? 0,
      act,
      sound: onSound,
      // Дойти и встать.
      walk: (to) => {
        goTo(girl, to, `stand`);
        return until(() => settled(girl, `stand`));
      },
      // Подождать столько секунд.
      wait: (seconds) => {
        let left = seconds;
        return (dt) => {
          left -= dt;
          return left <= 0;
        };
      },
      // Проверочный запуск с другой разметкой: { patch, acts }. Отдаёт
      // { world, acted } — снимок в конце и снимок после каждого действия.
      trial: (spec) => {
        let answer;
        let answered = false;
        trial(spec).then((result) => {
          answer = result;
          answered = true;
        });
        const waiting = () => answered;
        waiting.value = () => answer;
        return waiting;
      },
    };

    const start = (generator, onEnd) => {
      running = { steps: generator(helpers), wait: null, onEnd };
    };

    const finish = (result) => {
      if (result === true) {
        leaving = true;
        goTo(girl, to.at, to.pose);
        return;
      }
      if (girl.mode === `turn`) girl.mode = `stand`;
      if (result === `silent`) onOutcome(`silent`);
      else if (result) onOutcome(`almost`, result);
    };

    const advance = (dt) => {
      let time = dt;
      while (running) {
        const current = running;
        if (current.wait && !current.wait(time)) return;
        const value = current.wait?.value?.();
        current.wait = null;
        time = 0;

        const step = current.steps.next(value);
        if (!step.done) {
          current.wait = step.value;
          continue;
        }
        running = null;
        current.onEnd(step.value);
      }
    };

    return {
      enter: (isSolved) => {
        solved = isSolved;
        done = isSolved;
        armed = false;
        leaving = false;
        running = null;
        standAt(isSolved ? to : from);
        if (!isSolved && before) start(before, () => {});
      },

      // Запуск — страница чистая. Пока задача не решена, она снова там,
      // откуда начинала, с пустыми руками.
      run: () => {
        if (solved) return;
        running = null;
        leaving = false;
        armed = true;
        girl.carrying = false;
        standAt(from);
      },

      solve: () => {
        solved = true;
      },

      finished: () => done,

      update: (next) => {
        status = next;
        if (leaving && settled(girl, to.pose)) {
          leaving = false;
          done = true;
        }
        if (armed && status.showDone && status.world?.room.present) {
          armed = false;
          if (!status.failed) start(script, finish);
        }
        advance(status.dt ?? 0);
      },
    };
  };
