"""Проверяет, что в спрайтах нет ни одного цвета вне палитры станции.

Правила:
- прозрачность только 0 (пусто) или 255 (пиксель целиком);
- у каждого видимого пикселя цвет ровно из assets/palette.json.

Код выхода 1, если нарушено хоть в одном файле.

Пример:
  python tools/check_palette.py assets/sprites
  python tools/check_palette.py assets/sprites/terminal.png
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

from palette import load_palette, to_hex


def check(path, allowed):
    rgba = np.array(Image.open(path).convert("RGBA"))
    alpha = rgba[..., 3]
    problems = []

    soft = np.count_nonzero((alpha > 0) & (alpha < 255))
    if soft:
        problems.append(f"{soft} полупрозрачных пикселей")

    visible = rgba[alpha > 0][:, :3]
    colors, counts = np.unique(visible, axis=0, return_counts=True)
    stray = [(to_hex(c), n) for c, n in zip(colors, counts) if to_hex(c) not in allowed]
    if stray:
        listed = ", ".join(f"{hex_} ×{n}" for hex_, n in sorted(stray, key=lambda s: -s[1])[:10])
        problems.append(f"{len(stray)} цветов вне палитры: {listed}")

    size = f"{rgba.shape[1]}×{rgba.shape[0]}"
    if problems:
        print(f"ОШИБКА {path} ({size}): " + "; ".join(problems))
        return False

    print(f"OK     {path} ({size}): {len(colors)} цветов, все из палитры")
    return True


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)

    allowed = {to_hex(c) for c in load_palette()}
    files = []
    for arg in sys.argv[1:]:
        path = Path(arg)
        files += sorted(path.glob("**/*.png")) if path.is_dir() else [path]

    results = [check(path, allowed) for path in files]
    sys.exit(0 if results and all(results) else 1)


if __name__ == "__main__":
    main()
