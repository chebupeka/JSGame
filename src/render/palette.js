import { colors } from "../../assets/palette.json";

// Девять цветов станции, те же, что проверяют скрипты ассетов.
// Серое — обесточено, синее — живое, белое — только свет снаружи.
export const grey = colors.slice(0, 5);
export const [blueGlow, blue, blueLight, white] = colors.slice(5);
