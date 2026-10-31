"""Палитра станции и общие функции для скриптов ассетов.

Палитра лежит в assets/palette.json: игра и скрипты берут её из одного места.
"""

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
PALETTE_FILE = ROOT / "assets" / "palette.json"

# Консоль Windows по умолчанию в cp1251 и не печатает «×».
sys.stdout.reconfigure(encoding="utf-8")


def load_palette():
    """Цвета палитры как массив (9, 3) uint8, от тёмного к светлому."""
    colors = json.loads(PALETTE_FILE.read_text(encoding="utf-8"))["colors"]

    return np.array(
        [[int(hex_[i : i + 2], 16) for i in (1, 3, 5)] for hex_ in colors],
        dtype=np.uint8,
    )


def to_hex(rgb):
    return "#{:02X}{:02X}{:02X}".format(*rgb)


def srgb_to_oklab(rgb):
    """sRGB 0..1 → OKLab. В OKLab расстояние между цветами похоже на то,
    как разницу видит глаз, поэтому «ближайший цвет» выбирается честнее."""
    linear = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    lms = linear @ np.array(
        [
            [0.4122214708, 0.5363325363, 0.0514459929],
            [0.2119034982, 0.6806995451, 0.1073969566],
            [0.0883024619, 0.2817188376, 0.6299787005],
        ]
    ).T

    return np.cbrt(lms) @ np.array(
        [
            [0.2104542553, 0.7936177850, -0.0040720468],
            [1.9779984951, -2.4285922050, 0.4505937099],
            [0.0259040371, 0.7827717662, -0.8086757660],
        ]
    ).T


def nearest_index(rgb, palette):
    """Для каждого цвета (N, 3) uint8 — номер ближайшего цвета палитры."""
    keys = (rgb[:, 0].astype(np.int32) << 16) | (rgb[:, 1].astype(np.int32) << 8) | rgb[:, 2]
    unique_keys, inverse = np.unique(keys, return_inverse=True)
    unique_rgb = np.stack(
        [(unique_keys >> 16) & 255, (unique_keys >> 8) & 255, unique_keys & 255],
        axis=1,
    )

    lab = srgb_to_oklab(unique_rgb / 255)
    palette_lab = srgb_to_oklab(palette / 255)
    distance = (
        (lab**2).sum(1)[:, None]
        - 2 * lab @ palette_lab.T
        + (palette_lab**2).sum(1)[None, :]
    )

    return distance.argmin(1)[inverse]
