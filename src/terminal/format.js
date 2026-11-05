// Shift+Alt+F — эталон форматирования (решение 2): настоящий Prettier той же
// версии, что у профи, с шириной кода игрока. Он большой, поэтому грузится
// только при первом нажатии. Код, который не разобрался, не трогаем:
// о нём скажет браузер при запуске, дословно.
export const PLAYER_OPTIONS = { parser: `babel`, printWidth: 60 };

export const formatCode = async (code, cursorOffset = 0) => {
  const [{ formatWithCursor }, babel, estree] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/babel"),
    import("prettier/plugins/estree"),
  ]);

  try {
    const result = await formatWithCursor(code, {
      ...PLAYER_OPTIONS,
      cursorOffset,
      plugins: [babel.default ?? babel, estree.default ?? estree],
    });
    return {
      code: result.formatted,
      cursorOffset: result.cursorOffset,
      changed: result.formatted !== code,
    };
  } catch {
    return { code, cursorOffset, changed: false, broken: true };
  }
};
