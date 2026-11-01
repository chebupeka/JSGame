import palette from "../../assets/palette.json" with { type: "json" };

// Девять цветов станции, те же, что проверяют скрипты ассетов.
// Серое — обесточено, синее — живое, белое — только свет снаружи.
export const { colors } = palette;
export const grey = colors.slice(0, 5);
export const [blueGlow, blue, blueLight, white] = colors.slice(5);
