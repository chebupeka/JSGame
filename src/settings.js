// Настройки игрока: звук, громкость, подписи к звукам. Открываются вторым
// Esc (первый выводит фокус из терминала). Простая страница без украшений.
// Хранилище может быть недоступно — тогда настройки живут до перезагрузки.
const KEY = `jsgame.settings.v1`;
const DEFAULTS = { sound: true, volume: 0.6, captions: false };

export const loadSettings = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { ...DEFAULTS };
  }
};

const saveSettings = (settings) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Не сохранилось — настройки работают до перезагрузки.
  }
};

export const createSettingsPage = (root, settings, onChange) => {
  root.innerHTML = `
    <h2>Настройки</h2>
    <label><input type="checkbox" name="sound" /> Звук</label>
    <label>
      Громкость
      <input type="range" name="volume" min="0" max="1" step="0.05" />
    </label>
    <label><input type="checkbox" name="captions" /> Подписи к звукам</label>
    <p>Подписи появляются на верхней кромке терминала.</p>
    <p>Esc — назад к терминалу.</p>
  `;

  const field = (name) => root.querySelector(`[name="${name}"]`);
  field(`sound`).checked = settings.sound;
  field(`volume`).value = settings.volume;
  field(`captions`).checked = settings.captions;

  root.addEventListener(`input`, ({ target }) => {
    settings[target.name] =
      target.type === `checkbox` ? target.checked : Number(target.value);
    saveSettings(settings);
    onChange();
  });

  return {
    get isOpen() {
      return !root.hidden;
    },
    open: () => {
      root.hidden = false;
      field(`sound`).focus();
    },
    close: () => {
      root.hidden = true;
    },
  };
};
