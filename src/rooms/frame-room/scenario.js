import { placeGirl, sitDown, walkTo } from "../../girl/girl.js";
import { glassLevel } from "../../render/glass.js";
import { parseHex, parseRgb } from "../../render/ladder.js";
import { knobPosition, knobTurn } from "./knob.js";

// Она проверяет твой код так, как проверил бы тест (MECHANICS.md §3.4, §4):
// настоящими событиями, тремя положениями ручки, и смотрит на настоящий
// вычисленный цвет окна. Все три совпали — отпускает ручку и садится в свет.
// Нет — опускает руку и ждёт. Поведение, а не картинка: «почти» не считается.
//
// Она стоит слева от ручки: рука на кадре «крутить» — на 10 пикселей правее
// ног и на 27 выше, как раз до края головки. Садится на пол в свет окна,
// лицом к нему.
const AT_KNOB = [207, 86];
const SEAT = [92, 97];

const TRIES = [`#1f2f45`, `#3a6ea5`, `#9dbfe6`];

// Секунды: первая проба ручки до кода, пауза перед проверкой, поворот
// к положению, сколько ждать ответа окна.
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

export const createScenario = ({ girl, turnKnob, onOutcome }) => {
  let phase = `idle`;
  let timer = 0;
  // Есть запуск, который надо проверить.
  let armed = false;
  let solved = false;
  // Поворот к положению: откуда, куда, сколько прошло.
  let ramp = null;
  let tryIndex = 0;
  let sinceNudge = 0;

  const set = (next, wait = 0) => {
    phase = next;
    timer = wait;
  };

  const startRamp = (world, target) => {
    const from = knobPosition(world?.things.picker?.value);
    ramp = { from, to: knobPosition(target), target, t: 0 };
    sinceNudge = NUDGE;
    girl.mode = `turn`;
  };

  // Рука на ручке: значение идёт по шкале, каждое — настоящее событие input.
  // В конце — точное значение положения.
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

  const stop = (outcome) => {
    turnKnob(undefined, `change`);
    girl.mode = `wait`;
    set(`idle`);
    armed = false;
    onOutcome(outcome);
  };

  return {
    // Вошли в комнату. Задача решена — она уже сидит в свете.
    enter: (isSolved) => {
      solved = isSolved;
      armed = false;
      if (solved) {
        placeGirl(girl, SEAT, `sat`);
        set(`relight`);
      } else {
        set(`arrive`, ARRIVE);
      }
    },

    // Запуск: страница чистая. Решено — окно снова светит тем же светом.
    // Иначе, как только показ кончится, она проверит этот код.
    run: () => {
      ramp = null;
      if (solved) return set(`relight`);

      armed = true;
      // Уже шла садиться, а код поменяли: возвращается к ручке и проверяет
      // новый.
      if (phase === `leaving`) {
        walkTo(girl, AT_KNOB, `wait`);
        return set(`walking`);
      }
      if (phase !== `arrive` && phase !== `walking`) {
        if (girl.mode === `turn`) girl.mode = `wait`;
        set(`idle`);
      }
    },

    solve: () => {
      solved = true;
    },

    update: ({ dt, world, sensors, showDone, failed }) => {
      timer -= dt;

      // Шаг 0: подошла к ручке, щёлк-щёлк, окно серое, опустила руку.
      if (phase === `arrive` && timer <= 0) {
        walkTo(girl, AT_KNOB, `wait`);
        set(`walking`);
      }
      if (phase === `walking` && girl.mode === `wait`) {
        if (armed) {
          set(`idle`);
        } else {
          girl.mode = `turn`;
          set(`tryout`, TRYOUT);
        }
      }
      if (phase === `tryout` && timer <= 0) {
        girl.turn += 1;
        turnKnob(knobTurn(0.3 + girl.turn * 0.05), `input`);
        if (girl.turn >= 2) {
          turnKnob(undefined, `change`);
          girl.mode = `wait`;
          set(`idle`);
        } else {
          timer = TRYOUT;
        }
      }

      if (phase === `relight` && showDone) {
        turnKnob(TRIES.at(-1), `input`);
        set(`done`);
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
        tryIndex = 0;
        startRamp(world, TRIES[0]);
        set(`turning`);
      }

      if (phase === `turning` && stepRamp(dt)) set(`answer`, ANSWER);

      if (phase === `answer`) {
        const target = TRIES[tryIndex];
        const follows = windowFollows(world?.things.frame, target);
        if (follows) {
          tryIndex += 1;
          if (tryIndex === TRIES.length) {
            turnKnob(undefined, `change`);
            walkTo(girl, SEAT, `sit`);
            set(`leaving`);
          } else {
            startRamp(world, TRIES[tryIndex]);
            set(`turning`);
          }
        } else if (timer <= 0) {
          const lit = glassLevel(world?.things.frame?.background) !== null;
          stop(sensors.size ? `silent` : lit ? `almost` : `nothing`);
        }
      }

      if (phase === `leaving` && girl.mode === `sit`) {
        sitDown(girl);
        armed = false;
        set(`done`);
      }
    },
  };
};
