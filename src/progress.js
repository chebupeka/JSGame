// Прогресс игры в localStorage: какие файлы решены (они работают на
// мониторах станции), черновик текущего файла и какие задачи уже
// показали медленно (второй раз показ идёт в реальном времени). Хранилище может быть
// недоступно (приватное окно, запрет сайта) — тогда игра просто
// начинается сначала. Сброс для разработки: ?reset в адресе.
const KEY = `jsgame.progress.v1`;

const fresh = () => ({ solved: {}, drafts: {}, shown: {}, waited: {} });

export const loadProgress = () => {
  try {
    if (new URLSearchParams(location.search).has(`reset`)) {
      localStorage.removeItem(KEY);
    }
    return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return fresh();
  }
};

export const saveProgress = (progress) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Не сохранилось — игра идёт дальше, просто без памяти.
  }
};
