import css from "./room.css?raw";
import html from "./room.html?raw";

// Что в щитовой — вещи, а что просто стена. Вещь = настоящий элемент
// в песочнице; её классы — кадры спрайта (`on` — лампа горит).
export const SWITCHBOARD_ROOM = { html, css, root: `.room` };

export const SWITCHBOARD_THINGS = [{ key: `lamp`, selector: `#lamp` }];
