// Задачи станции идут цепочкой, а файлы живут дольше задач: `frame.js`
// растёт через четыре задачи главы 2, а в главе 4 к нему возвращаются.
// Здесь только чистые функции о том, какая задача открыта, какие файлы
// работают и что стоит в терминале при входе.

// Какая задача открыта: первая нерешённая, а если решено всё — последняя.
export const firstOpen = (tasks, solved) =>
  tasks.find(({ id }) => !solved[id]) ?? tasks.at(-1);

export const nextOf = (tasks, task) => tasks[tasks.indexOf(task) + 1] ?? null;

// Файлы станции для этой задачи: по порядку, в котором они появились,
// до самой задачи включительно. Порядок не меняется, даже когда правишь
// старый файл: иначе то, что работало, вдруг запускалось бы раньше того,
// на что опирается. current — код текущего файла вместо решённого.
export const filesFor = (tasks, task, files, current = null) => {
  const seen = tasks.slice(0, tasks.indexOf(task) + 1).map(({ file }) => file);
  return [...new Set(seen)].flatMap((name) => {
    const code = name === task.file && current !== null ? current : files[name];
    return code ? [{ name, code }] : [];
  });
};

// Файлы на мониторах места: один файл — один монитор, сколько бы задач
// его ни меняли. Ещё не решённые — пустые экраны.
export const monitorsOf = (tasks, files) =>
  [...new Set(tasks.map(({ file }) => file))].map(
    (name) => files[name] ?? null,
  );

// Где в файле кончается «Дано»: заметки в начале и пустые строки.
const briefEnd = (lines) => {
  const first = lines.findIndex(
    (line) => line.trim() && !line.trim().startsWith(`//`),
  );
  return first === -1 ? lines.length : first;
};

export const withoutBrief = (code) => {
  const lines = code.split(`\n`);
  return lines.slice(briefEnd(lines)).join(`\n`);
};

export const briefOf = (code) => {
  const lines = code.split(`\n`);
  const end = briefEnd(lines);
  return lines.slice(0, end).join(`\n`) + (end < lines.length ? `\n` : ``);
};

// Что в терминале при входе. Файл новый — текст из сценария. Файл уже есть —
// новое «Дано» из сценария, а под ним твой код прошлой задачи: в сценарии
// на этом месте эталон, в игре — то, что написал ты.
export const entryCode = (task, files) =>
  files[task.file]
    ? `${briefOf(task.code)}${withoutBrief(files[task.file])}`
    : task.code;
