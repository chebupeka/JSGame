"""Находит экран в спрайте монитора и записывает, где на нём рисовать код.

Экран — самый большой прямоугольник цвета #1B1B1B. Одиночные соринки внутри
него закрашиваются, чтобы под кодом был ровный фон. Координаты пишутся рядом
со спрайтом: terminal.png → terminal.json, {"screen": {"x", "y", "width", "height"}}.

Пример:
  python tools/screen_rect.py assets/sprites/terminal.png
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SCREEN = (0x1B, 0x1B, 0x1B)


def largest_rectangle(mask):
    """Самый большой прямоугольник из True (классический алгоритм со стеком)."""
    h, w = mask.shape
    heights = np.zeros(w, dtype=int)
    best = (0, 0, 0, 0, 0)

    for y in range(h):
        heights = np.where(mask[y], heights + 1, 0)
        stack = []
        for x in range(w + 1):
            current = heights[x] if x < w else 0
            start = x
            while stack and stack[-1][1] >= current:
                start, height = stack.pop()
                area = height * (x - start)
                if area > best[0]:
                    best = (area, start, y - height + 1, x - start, height)
            stack.append((start, current))

    _, x, y, width, height = best
    return x, y, width, height


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)

    sys.stdout.reconfigure(encoding="utf-8")
    path = Path(sys.argv[1])
    rgba = np.array(Image.open(path).convert("RGBA"))
    screen = (rgba[..., 3] == 255) & np.all(rgba[..., :3] == SCREEN, axis=-1)

    # Соринка не рвёт экран: клетка считается экраном, если вокруг неё
    # хотя бы 6 из 8 соседей — экран.
    padded = np.pad(screen, 1)
    neighbours = sum(
        padded[1 + dy : 1 + dy + screen.shape[0], 1 + dx : 1 + dx + screen.shape[1]]
        for dy in (-1, 0, 1)
        for dx in (-1, 0, 1)
        if dy or dx
    )
    x, y, width, height = largest_rectangle(screen | (neighbours >= 6))

    rgba[y : y + height, x : x + width] = (*SCREEN, 255)
    Image.fromarray(rgba, "RGBA").save(path)

    sidecar = path.with_suffix(".json")
    sidecar.write_text(
        json.dumps({"screen": {"x": int(x), "y": int(y), "width": int(width), "height": int(height)}}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{path}: экран {width}×{height} в точке {x},{y} → {sidecar}")


if __name__ == "__main__":
    main()
