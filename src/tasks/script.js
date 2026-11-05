// Задача — это тексты из сценария (src/tasks/script/*.json, их собирает
// tools/build_script.mjs из docs/acts) и поведение, написанное кодом:
// как она проверяет и что сказать после.
export const fromScript = (script) => (id, behaviour) => {
  const text = script.find((each) => each.id === id);
  if (!text) throw new Error(`В сценарии нет задачи ${id}`);
  return { ...text, ...behaviour };
};
