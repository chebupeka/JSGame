"""Рамы фальш-окна и плата ручки — рисуем сами, по пикселю.

Генератор на таких размерах даёт кашу (см. docs/ASSETS.md, лампа), поэтому
вещи собираются здесь из простых частей в стиле референса: тёмные массы,
свет слева сверху — светлые сколы на верхних и левых кромках, правая и
нижняя стороны растворяются в темноте, грязь — зазубрины и царапины
«сухой кистью». Стекло окон прозрачное: его светом заливает игра.

    python tools/draw_frame_room.py

Пишет в assets/sprites/:
- frame-big.png 64×40 и frame-big.json (стекло и площадка трафарета `.frame`
  на нижней планке);
- frame-small.png 30×14 и frame-small.json (стекло; трафарет — на стене);
- knob.png 56×24 и knob.json (полоса таблички `#frame-picker`, ось и радиус
  головки ручки: головку и стрелку рисует игра).
Координаты в JSON — в пикселях спрайта.
"""

import json
import math
import random

import numpy as np
from PIL import Image

from palette import ROOT, load_palette

SPRITES = ROOT / "assets" / "sprites"
PALETTE = load_palette()
EMPTY = -1


def blank(width, height, shade=EMPTY):
    return np.full((height, width), shade, dtype=int)


def fill(frame, x, y, w, h, shade):
    frame[y : y + h, x : x + w] = shade


def scratches(frame, rng, box, count, shades, keep=None):
    """Короткие обрывистые горизонтальные царапины «сухой кистью»."""
    x, y, w, h = box
    for _ in range(count):
        length = rng.randrange(2, 5)
        sx = rng.randrange(x, x + w - length + 1)
        sy = rng.randrange(y, y + h)
        if keep and any(inside(keep, px, sy) for px in range(sx, sx + length)):
            continue
        frame[sy, sx : sx + length] = rng.choice(shades)


def inside(box, x, y):
    bx, by, bw, bh = box
    return bx <= x < bx + bw and by <= y < by + bh


def bolt(frame, x, y):
    frame[y, x] = 0
    frame[y - 1, x - 1] = 3


def window_frame(width, height, glass, seed):
    """Рама: масса #222325, стекло прозрачное, glass = (x, y, w, h).
    Под стеклом подоконник во всю ширину спрайта, сама рама на пиксель
    уже с каждой стороны: так читается окно, а не экран."""
    rng = random.Random(seed)
    gx, gy, gw, gh = glass
    sill = gy + gh
    frame = blank(width, height)
    fill(frame, 1, 0, width - 2, sill, 1)
    fill(frame, 0, sill, width, height - sill, 1)

    # Рама: верх и левая стойка ловят свет, правая стойка в тени.
    for x in range(1, width - 1):
        t = (x - 1) / (width - 3)
        if t < 0.6:
            frame[0, x] = 4 if rng.random() < 0.35 else 3
        elif t < 0.8:
            frame[0, x] = 3 if rng.random() < 0.4 else 2
        else:
            frame[0, x] = 2 if rng.random() < 0.5 else 1
    for y in range(sill):
        frame[y, 1] = (4 if rng.random() < 0.3 else 3) if y < sill * 0.7 else 2
    fill(frame, width - 2, 1, 1, sill - 1, 0)
    for _ in range(width // 6):
        frame[0, rng.randrange(2, width - 2)] = 1
    for _ in range(max(1, sill // 6)):
        frame[rng.randrange(1, sill), 1] = 1

    # Подоконник: верхняя грань светлая слева, гаснет к правому краю;
    # торец слева ловит свет, справа и снизу — тень.
    for x in range(width):
        t = x / (width - 1)
        frame[sill, x] = (4 if rng.random() < 0.4 else 3) if t < 0.7 else (3 if rng.random() < 0.5 else 2)
    fill(frame, 0, sill + 1, 1, height - sill - 1, 3)
    fill(frame, width - 1, sill, 1, height - sill, 0)
    fill(frame, 0, height - 1, width, 1, 0)
    frame[height - 1, 0] = 1

    # Внутренняя кромка проёма: верх и лево в тени (их нижняя/правая грань
    # смотрит от света), правая стойка и подоконник ловят свет.
    fill(frame, gx - 1, gy - 1, gw + 2, 1, 0)
    fill(frame, gx - 1, gy - 1, 1, gh + 1, 0)
    for y in range(gy, gy + gh):
        frame[y, gx + gw] = 3 if rng.random() < 0.3 else 2

    # Стекло — дыра.
    fill(frame, gx, gy, gw, gh, EMPTY)
    return frame, rng


def frame_big():
    width, height = 64, 40
    glass = (4, 4, 56, 29)
    plate = (20, 33, 24, 7)
    frame, rng = window_frame(width, height, glass, seed=23)

    # Площадка трафарета — ровная (сам трафарет рисует игра).
    text = (plate[0], plate[1] + 1, plate[2], plate[3] - 2)
    scratches(frame, rng, (2, 1, width - 5, 2), 6, [2, 0])
    scratches(frame, rng, (1, 34, width - 3, 5), 7, [2, 0], keep=text)
    for y in range(5, 32, 5):
        if rng.random() < 0.6:
            frame[y, 2] = rng.choice([2, 0])
        if rng.random() < 0.6:
            frame[y, 61] = rng.choice([2, 0])
    for bx, by in [(3, 2), (60, 2), (3, 37), (61, 37)]:
        bolt(frame, bx, by)
    # Скол на углу подоконника, потёк грязи под ним.
    frame[33, 5:8] = 4
    frame[34:37, 50] = 0
    frame[34, 51] = 0

    return frame, {
        "glass": box(glass),
        "plate": box(plate),
    }


def frame_small():
    width, height = 30, 14
    glass = (4, 3, 22, 8)
    frame, rng = window_frame(width, height, glass, seed=31)
    scratches(frame, rng, (2, 1, width - 5, 1), 3, [2, 0])
    scratches(frame, rng, (1, 12, width - 3, 1), 3, [2, 0])
    for bx, by in [(3, 2), (26, 2)]:
        bolt(frame, bx, by)
    return frame, {"glass": box(glass)}


def knob_plate():
    """Плата 56×24: светлая лицевая сторона (на ступень светлее стены),
    гнездо ручки слева, шкала-клин «темнее → светлее» справа, внизу тёмная
    ровная полоса под табличку. Головку и стрелку рисует игра."""
    rng = random.Random(41)
    width, height = 56, 24
    plate = (1, 17, 54, 7)
    cx, cy, radius = 11, 9, 6

    frame = blank(width, height, 4)
    for x in range(width):
        frame[0, x] = 3 if rng.random() < 0.25 else 4
    for y in range(height):
        frame[y, 0] = 3 if rng.random() < 0.25 else 4
    fill(frame, width - 1, 1, 1, height - 1, 1)
    fill(frame, width - 2, 2, 1, height - 3, 3)
    fill(frame, 0, height - 1, width, 1, 0)

    # Царапины «сухой кистью» по лицевой стороне.
    scratches(frame, rng, (2, 1, width - 4, 15), 14, [3, 3, 2])

    # Гнездо ручки: тёмное кольцо вокруг головки.
    for y in range(height):
        for x in range(width):
            d = math.hypot(x - cx, y - cy)
            if radius + 0.3 < d <= radius + 1.4:
                frame[y, x] = 1 if (x - cx) + (y - cy) > 2 else 0
            elif d <= radius + 0.3:
                rim = d > radius - 1 and (x - cx) + (y - cy) < 0
                frame[y, x] = 4 if rim else 3

    # Риски шкалы по дуге, как ходит стрелка (±135° от верха).
    for step in range(7):
        angle = math.radians(-135 + step * 45)
        x = round(cx + math.sin(angle) * 8.6)
        y = round(cy - math.cos(angle) * 8.6)
        frame[y, x] = 1
    frame[15, 4] = 0
    frame[15, 18] = 1

    # Клин справа: тонкий у тёмного конца, толстый у светлого.
    left, right, base = 25, 52, 12
    for x in range(left, right + 1):
        h = 1 + round((x - left) / (right - left) * 6)
        fill(frame, x, base - h + 1, 1, h, 1)
    for x in range(left, right + 1, 3):
        frame[14, x] = 1
    frame[15, left] = 1
    frame[15, right] = 1

    # Болты по верхним углам.
    for bx, by in [(2, 2), (53, 2)]:
        frame[by, bx] = 1
        frame[by + 1, bx + 1] = 3

    # Полоса таблички: ровная, тёмная.
    fill(frame, *plate, 1)
    fill(frame, plate[0] + plate[2], plate[1], 1, plate[3], 0)

    # Грязь по нижней кромке лицевой стороны и сколы на углах.
    for _ in range(6):
        frame[16, rng.randrange(2, width - 3)] = 3
    frame[0, 0] = 3
    frame[height - 1, width - 1] = 0

    return frame, {
        "plate": box(plate),
        "center": {"x": cx, "y": cy},
        "radius": radius,
    }


def box(rect):
    x, y, w, h = rect
    return {"x": x, "y": y, "w": w, "h": h}


def save(frame, meta, name):
    height, width = frame.shape
    out = np.zeros((height, width, 4), dtype=np.uint8)
    for y, x in zip(*np.nonzero(frame != EMPTY)):
        out[y, x, :3] = PALETTE[frame[y, x]]
        out[y, x, 3] = 255
    Image.fromarray(out, "RGBA").save(SPRITES / f"{name}.png")
    (SPRITES / f"{name}.json").write_text(
        json.dumps(meta, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{name}.png: {width}×{height}, {name}.json: {meta}")


if __name__ == "__main__":
    save(*frame_big(), "frame-big")
    save(*frame_small(), "frame-small")
    save(*knob_plate(), "knob")
