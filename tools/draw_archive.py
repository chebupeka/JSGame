"""Полка, ящики и стол архива — рисуем сами, по пикселю (docs/ASSETS.md).

Тот же приём, что в draw_frame_room.py: тёмные массы, свет слева сверху —
светлые сколы на верхних и левых кромках, правая и нижняя стороны
растворяются в темноте, грязь — короткие царапины «сухой кистью».

    python tools/draw_archive.py

Пишет в assets/sprites/:
- shelf.png 98×43: полка с шестью гнёздами 14×22 (места — в shelf.json);
- drawer.png 42×22: три кадра 14×22 — закрыт, выдвинут, заперт. Номер
  и бирку рисует игра;
- table.png 44×23: стол у ставня.
"""

import json
import random

import numpy as np
from PIL import Image

from draw_frame_room import blank, fill, scratches
from palette import ROOT, load_palette

SPRITES = ROOT / "assets" / "sprites"
PALETTE = load_palette()
EMPTY = -1

DRAWER_W, DRAWER_H = 14, 22
PITCH = 16
SLOT_X, SLOT_Y = 2, 11


def shelf():
    rng = random.Random(61)
    width, height = 98, 43
    frame = blank(width, height, 1)

    # Верхняя доска: ловит свет слева, гаснет к правому краю.
    fill(frame, 0, 0, width, 4, 2)
    for x in range(width):
        t = x / (width - 1)
        frame[0, x] = (4 if rng.random() < 0.4 else 3) if t < 0.65 else (3 if rng.random() < 0.4 else 2)
    fill(frame, 0, 4, width, 1, 0)

    # Стойки и нижняя доска.
    fill(frame, 0, 0, 1, height, 3)
    fill(frame, width - 1, 0, 1, height, 0)
    fill(frame, 0, height - 5, width, 5, 2)
    for x in range(width):
        frame[height - 5, x] = 3 if rng.random() < 0.3 else 2
    fill(frame, 0, height - 1, width, 1, 0)

    # Гнёзда ящиков — тёмные проёмы.
    slots = []
    for index in range(6):
        x = SLOT_X + index * PITCH
        fill(frame, x, SLOT_Y, DRAWER_W, DRAWER_H + 4, 0)
        slots.append({"x": x, "y": SLOT_Y, "w": DRAWER_W, "h": DRAWER_H})

    scratches(frame, rng, (1, 1, width - 3, 3), 12, [1, 3])
    scratches(frame, rng, (1, 39, width - 3, 3), 12, [1, 3])
    scratches(frame, rng, (1, 5, width - 3, 5), 10, [0, 2])
    return frame, {"slots": slots}


def drawer_face(rng, face, edge):
    frame = blank(DRAWER_W, DRAWER_H, face)
    # Верх и лево ловят свет, право и низ в тени.
    for x in range(DRAWER_W):
        frame[0, x] = edge if rng.random() < 0.7 else face
    for y in range(DRAWER_H):
        frame[y, 0] = edge if rng.random() < 0.6 else face
    fill(frame, DRAWER_W - 1, 1, 1, DRAWER_H - 1, 0)
    fill(frame, 0, DRAWER_H - 1, DRAWER_W, 1, 0)
    scratches(frame, rng, (1, 8, DRAWER_W - 3, 3), 2, [1, face + 1 if face < 4 else 3])
    # Ручка: тёмная прорезь и светлая планка над ней.
    fill(frame, 3, 11, 8, 1, 4)
    fill(frame, 3, 12, 8, 2, 0)
    return frame


def drawers():
    rng = random.Random(67)
    closed = drawer_face(rng, 2, 3)
    # Выдвинут: лицевая сторона на ступень светлее, она ближе к свету.
    opened = drawer_face(rng, 3, 4)
    # Заперт: на ручке замок — дужка и корпус.
    locked = drawer_face(rng, 2, 3)
    fill(locked, 5, 9, 4, 1, 4)
    fill(locked, 5, 10, 1, 2, 4)
    fill(locked, 8, 10, 1, 2, 3)
    fill(locked, 4, 12, 6, 4, 4)
    fill(locked, 9, 13, 1, 3, 1)
    locked[14, 7] = 0

    sheet = blank(DRAWER_W * 3, DRAWER_H)
    for index, frame in enumerate([closed, opened, locked]):
        sheet[:, index * DRAWER_W : (index + 1) * DRAWER_W] = frame
    return sheet


def table():
    rng = random.Random(71)
    width, height = 44, 23
    frame = blank(width, height)

    # Столешница: верх ловит свет, торец темнее.
    fill(frame, 0, 0, width, 5, 2)
    for x in range(width):
        t = x / (width - 1)
        frame[0, x] = (4 if rng.random() < 0.5 else 3) if t < 0.7 else (3 if rng.random() < 0.4 else 2)
    fill(frame, 0, 4, width, 1, 0)
    fill(frame, width - 1, 1, 1, 4, 0)
    scratches(frame, rng, (1, 1, width - 3, 3), 10, [1, 3])

    # Ножки и перекладина.
    for x, shade in ((3, 2), (width - 7, 1)):
        fill(frame, x, 5, 4, height - 5, shade)
        fill(frame, x, 5, 1, height - 5, 3 if shade == 2 else 2)
        fill(frame, x + 3, 5, 1, height - 5, 0)
    fill(frame, 7, 12, width - 14, 2, 1)
    fill(frame, 7, 12, width - 14, 1, 2)
    return frame


def save(frame, name, meta=None):
    height, width = frame.shape
    out = np.zeros((height, width, 4), dtype=np.uint8)
    for y, x in zip(*np.nonzero(frame != EMPTY)):
        out[y, x, :3] = PALETTE[frame[y, x]]
        out[y, x, 3] = 255
    Image.fromarray(out, "RGBA").save(SPRITES / f"{name}.png")
    if meta:
        (SPRITES / f"{name}.json").write_text(
            json.dumps(meta, indent=2) + "\n", encoding="utf-8"
        )
    print(f"{name}.png: {width}×{height}")


if __name__ == "__main__":
    frame, meta = shelf()
    save(frame, "shelf", meta)
    save(drawers(), "drawer")
    save(table(), "table")
