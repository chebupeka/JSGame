import { goTo, placeGirl, settled } from "../girl/girl.js";

// Самая простая её проверка: смотрит на настоящий снимок мира после запуска.
// Всё как надо — идёт дальше, и когда дошла, задача решена. Поведение,
// а не картинка: test смотрит на классы и значения из песочницы.
//
// from и to — где она и что делает, до и после: { at: [x, ноги], pose }.
// test(world, { code }) отвечает true, или строкой пометки «почти», или
// `silent` — тихая ошибка без своей пометки, или false — сказать нечего.
// again — ещё раз, на невидимой станции с немного другой разметкой:
// { patch, test }. Так ловится код, подогнанный под одно значение.
export const snapshotCheck =
  ({ from, to, test, again = null }) =>
  ({ girl, onOutcome, trial }) => {
    let solved = false;
    // Есть запуск, который надо проверить, и о нём ещё не сказано.
    let armed = false;
    let told = false;
    let leaving = false;
    let done = false;
    // Чей проверочный запуск ещё в силах: новый запуск отменяет старый.
    let ticket = 0;

    const standAt = ({ at, pose }) =>
      placeGirl(girl, at, pose === `sit` ? `sat` : pose);

    const tell = (verdict) => {
      if (told) return;
      told = true;
      if (verdict === `silent`) onOutcome(`silent`);
      else if (verdict) onOutcome(`almost`, verdict);
    };

    const leave = () => {
      leaving = true;
      goTo(girl, to.at, to.pose);
    };

    const tryAgain = (code) => {
      const mine = ++ticket;
      trial({ patch: again.patch }).then((world) => {
        if (mine !== ticket) return;
        const verdict = world ? again.test(world, { code }) : false;
        if (verdict === true) leave();
        else tell(verdict);
      });
    };

    return {
      enter: (isSolved) => {
        solved = isSolved;
        done = isSolved;
        standAt(isSolved ? to : from);
      },

      // Запуск — страница чистая. Пока задача не решена, она снова там,
      // откуда пробовала, и ждёт, что получится.
      run: () => {
        if (solved) return;
        armed = true;
        told = false;
        ticket += 1;
        if (leaving) standAt(from);
        leaving = false;
      },

      solve: () => {
        solved = true;
      },

      update: ({ world, showDone, failed, code }) => {
        if (leaving && settled(girl, to.pose)) done = true;
        if (!armed || !showDone || failed) return;
        if (!world?.room.present) return;

        const verdict = test(world, { code });
        if (verdict !== true) return tell(verdict);

        armed = false;
        if (again) tryAgain(code);
        else leave();
      },

      finished: () => done,
    };
  };
