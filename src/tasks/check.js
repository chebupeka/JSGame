import { goTo, placeGirl, settled } from "../girl/girl.js";

// Самая простая её проверка: смотрит на настоящий снимок мира после запуска.
// Всё как надо — идёт дальше, и когда дошла, задача решена. Поведение,
// а не картинка: test смотрит на классы и значения из песочницы.
//
// from и to — где она и что делает, до и после: { at: [x, ноги], pose }.
// test(world) отвечает true, или строкой пометки «почти», или false.
export const snapshotCheck =
  ({ from, to, test }) =>
  ({ girl, onOutcome }) => {
    let solved = false;
    // Есть запуск, который надо проверить, и о нём ещё не сказано.
    let armed = false;
    let told = false;
    let leaving = false;
    let done = false;

    const standAt = ({ at, pose }) =>
      placeGirl(girl, at, pose === `sit` ? `sat` : pose);

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
        if (leaving) standAt(from);
        leaving = false;
      },

      solve: () => {
        solved = true;
      },

      update: ({ world, showDone, failed }) => {
        if (leaving && settled(girl, to.pose)) done = true;
        if (!armed || leaving || !showDone || failed) return;

        const verdict = test(world);
        if (verdict === true) {
          leaving = true;
          armed = false;
          goTo(girl, to.at, to.pose);
        } else if (!told) {
          told = true;
          onOutcome(`almost`, verdict || null);
        }
      },

      finished: () => done,
    };
  };
