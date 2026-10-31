# Как делать ассеты

Рецепт проверен на терминале (`assets/sprites/terminal.png`, 31.10.2026): три итерации и три независимых судьи.

## Конвейер

1. **Генерация** — Codex MCP `generate_image`, 4 варианта за раз, `aspect: landscape`, `transparent: true`, референсы: `docs/reference/mood.webp` и вырезка похожих вещей из него. Сырые картинки — в `assets/_raw/` (не в git).
2. **Палитра и пиксели:**
   ```
   python tools/fit_palette.py assets/_raw/вещь.png assets/sprites/вещь.png --without "#FFFFFF"
   ```
   Скрипт сам находит сетку «пикселей» нейросети (клетка 5–9 точек) и берёт в каждой клетке самый частый цвет. Не растягивай результат на нецелый множитель через `--width`: линии становятся то в 1, то в 2 пикселя. Нужен другой размер — генерируй заново.
3. **Экран** (только для мониторов): `python tools/screen_rect.py assets/sprites/вещь.png` — чистит экран и пишет его координаты в `вещь.json`.
4. **Проверка:** `python tools/check_palette.py assets/sprites` — падает на любом цвете вне палитры и на полупрозрачных пикселях.
5. **Примерка:** `python tools/preview.py спрайт.png превью.png --background фон.png --at X,Y` — кадр 320×180 ×4. Примерять на закрытую серую комнату: так её видит игрок до финала.

Модель картинок задаёт переменная `CODEX_IMAGE_MODEL` у сервера `codex-imagegen` в `~/.claude.json` (сейчас `gpt-6.1-terra`).

## Что делает стиль похожим на референс

- **Плоско, как тушью:** ровные заливки, три ступени серого, как печать в 4 краски. Никаких фасок, глянца, «брони», плавных градиентов.
- **Нет замкнутого контура.** Сторона к свету ловит светлые сколы, теневая сторона растворяется в темноте. Контур по всему силуэту делает вещь наклейкой.
- **Передний план тёмный:** в основном `#1B1B1B` и `#222325`, светлее только лицевые грани, `#3D4248` — мелкие сколы и царапины.
- **Грязь:** мелкие тёмные зазубрины, светлые точки по краям, короткие обрывистые горизонтальные царапины «сухой кистью».
- **Вид спереди на уровне глаз,** глубина — одной боковой гранью. Вещь не висит в воздухе: низ уходит за кадр или стоит на опоре.
- **Белого внутри нет** (`--without "#FFFFFF"`): белое — только снаружи, щель и облака.
- **Синее в спрайте — только если это кадр «включено кодом игрока».** Свечение экрана терминала, свет на полу, провода и импульсы рисует игра, а не спрайт.

## Промпт, который сработал (терминал)

Главные куски, которые стоит переносить в промпты других вещей:

> Flat posterised pixel art like a pixelated ink drawing, three grey steps like a 4-colour print, not cel-shaded. NO closed outline around the object: edges facing the light catch small light-grey chips; edges on the shadow side dissolve into near-black with no contour line. Dark shapes are blotches and shadow masses, not strokes of even width. Grime: many tiny 1-pixel dark notches and light-grey specks along the edges, short broken horizontal dry-brush scratches, chipped corners; no smooth noise shading, no gradients. Chunky square pixels, hard edges, no anti-aliasing.

> Colours: grey only, use only #1B1B1B #222325 #2C3034 #343638 #3D4248. It is a dark foreground object: mostly #1B1B1B and #222325 masses.

> Pixel grid: pixel art on a 192x128 grid, each art pixel exactly 8x8 image pixels.

> Do not draw: robot, face, hovering box, cables under the box like legs, ribbed hose, armoured conduit, chamfered or bevelled armour panels, rounded sci-fi corners, HUD frame, trim ring, text, logo.

> Transparent background with hard edges: only the object, no floor, no cast shadow, no glow halo.

## Чего избегать (видели в итерациях 1–2)

- «Защищённый планшет», бронепанели, шланги петлёй, корпус как у робота с экраном-лицом.
- Синие обводки и блики на корпусе: читаются как неон и ломают правило «серое — обесточено».
- Свечение экрана отрезками по углам: выглядит как рамка интерфейса.
