"""Рубильник и автомат — маленькие вещи, рисуем их сами, по пикселю.

Генератор на таком размере даёт кашу (см. docs/ASSETS.md, лампа), поэтому
кадры собираются здесь из простых частей в стиле референса: тёмные массы,
свет слева (от стекла терминала) — светлые сколы на левых кромках, правая
сторона растворяется в темноте, грязь — зазубрины и царапины «сухой кистью».

    python tools/draw_controls.py

Пишет assets/sprites/lever.png (3 кадра 16×32: разомкнут, на полпути,
замкнут) и assets/sprites/breaker.png (2 кадра 10×14: взведён, выбит).
"""

import random

import numpy as np
from PIL import Image

from palette import ROOT, load_palette

SPRITES = ROOT / "assets" / "sprites"
PALETTE = load_palette()
EMPTY = -1


def blank(width, height):
    return np.full((height, width), EMPTY, dtype=int)


def fill(frame, x, y, w, h, shade):
    frame[y : y + h, x : x + w] = shade


def grime(frame, rng, box, count):
    """Тёмные зазубрины по кромкам и короткие царапины на лицевой грани."""
    x, y, w, h = box
    for _ in range(count):
        side = rng.choice(["left", "top", "right", "bottom"])
        if side == "left":
            frame[rng.randrange(y + 1, y + h - 1), x] = rng.choice([3, 4, 1])
        elif side == "top":
            frame[y, rng.randrange(x + 1, x + w // 2)] = rng.choice([3, 4])
        elif side == "right":
            frame[rng.randrange(y + 1, y + h - 1), x + w - 1] = EMPTY
        else:
            frame[y + h - 1, rng.randrange(x + 1, x + w - 1)] = 0


def scratch(frame, rng, box, count, shade):
    x, y, w, h = box
    for _ in range(count):
        length = rng.randrange(2, 4)
        sx = rng.randrange(x, x + w - length)
        sy = rng.randrange(y, y + h)
        frame[sy, sx : sx + length] = shade


def housing(width, height, rng):
    """Корпус: масса #2C3034 — на ступень светлее стола, чтобы рубильник
    (двойник Ctrl+Enter) читался. Левая кромка ловит свет, правая — в тени."""
    frame = blank(width, height)
    fill(frame, 1, 1, width - 2, height - 1, 2)
    fill(frame, 1, 1, 1, height - 1, 3)
    fill(frame, 2, 1, width // 2 - 1, 1, 4)
    fill(frame, width // 2 + 1, 1, width // 2 - 3, 1, 3)
    fill(frame, width - 3, 2, 1, height - 3, 1)
    fill(frame, width - 2, 2, 1, height - 2, 0)
    fill(frame, 1, height - 1, width - 2, 1, 0)
    frame[1, 1] = 4
    frame[1, 2] = 4
    grime(frame, rng, (1, 1, width - 2, height - 1), 10)
    return frame


def lever_frames():
    """Рубильник 16×32: щель посередине, Т-образная ручка ходит по ней.
    Наверху — разомкнут, внизу — замкнут, посередине — на полпути."""
    rng = random.Random(7)
    base = housing(16, 32, rng)
    scratch(base, rng, (3, 3, 10, 26), 5, 1)

    # Щель: тёмная, правая стенка ловит свет из-за кромки.
    fill(base, 7, 4, 2, 24, 0)
    fill(base, 9, 4, 1, 24, 3)
    # Риски положений слева от щели.
    fill(base, 3, 5, 2, 1, 3)
    fill(base, 3, 26, 2, 1, 3)
    # Болты по углам.
    for bx, by in [(3, 2), (12, 2), (3, 29), (12, 29)]:
        base[by, bx] = 0
        base[by - 1 if by > 2 else by, bx - 1] = 3

    frames = []
    for top in (4, 13, 22):
        frame = base.copy()
        fill(frame, 7, top + 3, 2, 2, 3)  # шток уходит в щель
        fill(frame, 2, top, 12, 3, 4)
        fill(frame, 10, top, 3, 1, 3)
        fill(frame, 2, top + 2, 12, 1, 1)
        fill(frame, 12, top + 1, 1, 1, 3)
        fill(frame, 13, top, 1, 3, 0)
        frames.append(frame)
    return frames


def breaker_frames():
    """Автомат 10×14: клеммы сверху и снизу, флажок в окне.
    Взведён — флажок вверху, выбит — внизу."""
    rng = random.Random(11)
    base = housing(10, 14, rng)
    fill(base, 3, 1, 4, 1, 2)
    for y in (2, 11):
        fill(base, 3, y, 4, 1, 0)
        base[y, 3] = 3
    fill(base, 3, 4, 4, 6, 0)
    fill(base, 7, 4, 1, 6, 2)

    frames = []
    for top in (4, 7):
        frame = base.copy()
        fill(frame, 3, top, 4, 3, 4)
        fill(frame, 6, top + 1, 1, 1, 3)
        fill(frame, 3, top + 2, 4, 1, 1)
        frames.append(frame)
    return frames


def save(frames, name):
    height, width = frames[0].shape
    sheet = np.zeros((height, width * len(frames), 4), dtype=np.uint8)
    for i, frame in enumerate(frames):
        for y, x in zip(*np.nonzero(frame != EMPTY)):
            sheet[y, i * width + x, :3] = PALETTE[frame[y, x]]
            sheet[y, i * width + x, 3] = 255
    Image.fromarray(sheet, "RGBA").save(SPRITES / name)
    print(f"{name}: {len(frames)} кадра {width}×{height}")


if __name__ == "__main__":
    save(lever_frames(), "lever.png")
    save(breaker_frames(), "breaker.png")
