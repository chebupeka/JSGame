import { goTo, placeGirl, settled } from "../../girl/girl.js";
import { glassLevel } from "../../render/glass.js";
import { parseHex, parseRgb } from "../../render/ladder.js";
import { knobPosition, knobTurn } from "./knob.js";

// Она проверяет твой код так, как проверил бы тест (MECHANICS.md §3.4, §4):
// настоящими событиями, тремя положениями ручки, и смотрит на настоящие
// значения в мире. Все совпали — отпускает ручку и садится в свет. Нет —
// опускает руку и ждёт. Поведение, а не картинка: «почти» не считается.
//
// Она стоит слева от ручки: рука на кадре «крутить» — на 10 пикселей правее
// ног и на 27 выше, как раз до края головки. Садится на пол в свет окна,
// лицом к нему.
export const AT_KNOB = [207, 86];
export const SEAT = [92, 97];

export const STOPS = [`#1f2f45`, `#3a6ea5`, `#9dbfe6`];

// Секунды: первая проба ручки до кода, пауза перед проверкой, поворот
// к положению, сколько ждать ответа мира.
const ARRIVE = 0.8;
const TRYOUT = 0.45;
const BEAT = 1.5;
const RAMP = 1.3;
const NUDGE = 0.09;
const ANSWER = 0.7;

// Совпадает ли цвет окна со значением ручки: стекло — вычисленный цвет
// из песочницы, ручка — #rrggbb.
export const windowFollows = (thing, value) => {
  if (!thing?.present || !value || glassLevel(thing.background) === null) {
    return false;
  }
  const shown = parseRgb(thing.background);
  return parseHex(value).every((part, i) => Math.abs(part - shown[i]) <= 1);
};

// Проверка ручкой. Что разное у разных задач:
//   from      — где она при входе: { at, pose }; после задачи всегда садится;
//   tryout    — до кода сама пробует ручку (шаг 0, MECHANICS.md §4);
//   follows   — (world, value) => верно ли всё на этом положении;
//   release   — отпускает ручку на каждом положении (событие change);
//   visit     — после этого подходит и смотрит: [x, ноги];
//   holds     — (world, before) => не изменилось ли то, что должно ждать,
//               пока она крутит и ещё не отпустила;
//   judge     — ({ world, sensors, code, broken }) => что сказать, если не
//               получилось: строка пометки, `silent` или ничего;
//   extra     — ({ finds, foundKeys, code }) => работает, но не то, ради
//               чего задача: она садится, а задача не решена.
export const knobCheck =
  ({
    from = { at: SEAT, pose: `sit` },
    tryout = false,
    follows = (world, value) => windowFollows(world?.things.frame, value),
    release = false,
    visit = null,
    holds = null,
    judge = null,
    extra = null,
  } = {}) =>
  ({ girl, turnKnob, onOutcome }) => {
    let phase = `idle`;
    let timer = 0;
    // Есть запуск, который надо проверить.
    let armed = false;
    let done = false;
    let tries = 0;
    // Поворот к положению: откуда, куда, сколько прошло.
    let ramp = null;
    let index = 0;
    let sinceNudge = 0;
    let before = null;
    let last = {};

    const set = (next, wait = 0) => {
      phase = next;
      timer = wait;
    };

    const startRamp = (world, target) => {
      const start = knobPosition(world?.things.picker?.value);
      ramp = { from: start, to: knobPosition(target), target, t: 0 };
      sinceNudge = NUDGE;
      before = world;
      girl.mode = `turn`;
      set(`turning`);
    };

    // Рука на ручке: значение идёт по шкале, каждое — настоящее событие
    // input. В конце — точное значение положения.
    const stepRamp = (dt) => {
      ramp.t += dt;
      sinceNudge += dt;
      const share = Math.min(1, ramp.t / RAMP);
      if (share === 1) {
        turnKnob(ramp.target, `input`);
        return true;
      }
      if (sinceNudge < NUDGE) return false;

      sinceNudge = 0;
      girl.turn += 1;
      turnKnob(knobTurn(ramp.from + (ramp.to - ramp.from) * share), `input`);
      return false;
    };

    const tell = (fallback) => {
      const said = judge?.(last);
      if (said === `silent`) return onOutcome(`silent`);
      if (said) return onOutcome(`almost`, said);
      return onOutcome(fallback);
    };

    const stop = (fallback) => {
      turnKnob(undefined, `change`);
      girl.mode = `wait`;
      set(`idle`);
      armed = false;
      tell(fallback);
    };

    return {
      // Вошли в задачу. Решена — она уже сидит в свете. Нет — там, откуда
      // начинает; если надо, сперва сама пробует ручку.
      enter: (isSolved) => {
        done = isSolved;
        armed = false;
        if (isSolved) {
          placeGirl(girl, SEAT, `sat`);
          return set(`done`);
        }
        placeGirl(girl, from.at, from.pose === `sit` ? `sat` : from.pose);
        set(tryout ? `arrive` : `idle`, tryout ? ARRIVE : 0);
      },

      // Запуск: страница чистая. Как только показ кончится, она проверит
      // этот код. Сидела или шла садиться — встаёт и возвращается к ручке.
      run: () => {
        ramp = null;
        armed = true;
        done = false;
        if (phase === `arrive` || phase === `walking`) return;
        goTo(girl, AT_KNOB, `wait`);
        if (girl.mode === `wait`) return set(`idle`);
        set(`walking`);
      },

      solve: () => {},

      finished: () => done,

      update: ({
        dt,
        world,
        sensors,
        showDone,
        failed,
        code = ``,
        finds = 0,
        foundKeys = new Set(),
      }) => {
        timer -= dt;
        last = { world, sensors, code, finds, foundKeys };

        // Шаг 0: подошла к ручке, щёлк-щёлк, окно не отвечает, опустила руку.
        if (phase === `arrive` && timer <= 0) {
          goTo(girl, AT_KNOB, `wait`);
          set(`walking`);
        }
        if (phase === `walking` && girl.mode === `wait`) {
          if (armed || !tryout) {
            set(`idle`);
          } else {
            girl.mode = `turn`;
            set(`tryout`, TRYOUT);
          }
        }
        if (phase === `tryout` && timer <= 0) {
          tries += 1;
          girl.turn += 1;
          turnKnob(knobTurn(0.3 + tries * 0.05), `input`);
          if (tries >= 2) {
            turnKnob(undefined, `change`);
            girl.mode = `wait`;
            set(`idle`);
          } else {
            timer = TRYOUT;
          }
        }

        if (phase === `idle` && armed && showDone) {
          if (failed) {
            armed = false;
            girl.mode = `wait`;
          } else {
            set(`beat`, BEAT);
          }
        }
        if (phase === `beat` && timer <= 0 && !failed) {
          index = 0;
          startRamp(world, STOPS[0]);
        }

        // Пока крутит и не отпустила, то, что должно ждать, ждёт.
        if (phase === `turning` && holds && !holds(world, before)) {
          return stop(`almost`);
        }
        if (phase === `turning` && stepRamp(dt)) {
          if (release) turnKnob(undefined, `change`);
          if (visit) {
            goTo(girl, visit, `wait`);
            set(`visit`);
          } else {
            set(`answer`, ANSWER);
          }
        }
        if (phase === `visit` && girl.mode === `wait`) set(`answer`, ANSWER);

        if (phase === `answer`) {
          const value = STOPS[index];
          if (follows(world, value)) {
            index += 1;
            if (index === STOPS.length) {
              if (!release) turnKnob(undefined, `change`);
              goTo(girl, SEAT, `sit`);
              set(`leaving`);
            } else if (visit) {
              goTo(girl, AT_KNOB, `wait`);
              set(`back`);
            } else {
              startRamp(world, STOPS[index]);
            }
          } else if (timer <= 0) {
            const lit = glassLevel(world?.things.frame?.background) !== null;
            stop(sensors.size ? `silent` : lit ? `almost` : `nothing`);
          }
        }
        if (phase === `back` && girl.mode === `wait`) {
          startRamp(world, STOPS[index]);
        }

        // Села. Всё работает — задача решена. Работает, но не то, ради чего
        // задача, — сидит, а на полях об этом; следующий запуск проверит снова.
        if (phase === `leaving` && settled(girl, `sit`)) {
          set(`done`);
          armed = false;
          const said = extra?.({ finds, foundKeys, code });
          if (said) onOutcome(`almost`, said);
          else done = true;
        }
      },
    };
  };
