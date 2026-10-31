"""Приводит сгенерированную картинку к палитре станции и к настоящим пикселям.

Что делает:
1. Полупрозрачное становится либо прозрачным, либо непрозрачным (порог --alpha).
2. Каждый пиксель исходника заменяется ближайшим цветом палитры (в OKLab).
3. Картинка ужимается до настоящих пикселей: в каждой клетке сетки побеждает
   самый частый цвет. Размер клетки скрипт находит сам по ритму границ
   («пиксели» нейросети — это квадраты по 5–8 точек). Можно задать размер
   результата вручную через --width (и --height).
4. Пустые края обрезаются.

Пример:
  python tools/fit_palette.py assets/_raw/terminal-v1-1.png assets/sprites/terminal.png
  python tools/fit_palette.py docs/reference/mood.webp assets/_preview/mood.png --width 320 --height 180
  python tools/fit_palette.py raw.png sprite.png --without "#FFFFFF"   (белый только снаружи)
"""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

from palette import load_palette, nearest_index, to_hex


def estimate_grid(profiles, shortest=3, longest=24):
    """Размер клетки и сдвиг сетки по профилям границ (через спектр Фурье).

    profiles — профили перепадов по столбцам и по строкам: profile[x] —
    сила перепада между x и x + 1. Если картинка состоит из квадратов
    размера p, перепады повторяются каждые p точек. Пиксели квадратные,
    поэтому период ищется один на обе оси: спектры складываются.
    """
    signals = [p - p.mean() for p in profiles]
    size = 1 << int(np.ceil(np.log2(max(len(s) for s in signals) * 16)))
    freqs = np.fft.rfftfreq(size)
    allowed = (freqs >= 1 / longest) & (freqs <= 1 / shortest)

    total = np.zeros(len(freqs))
    for signal in signals:
        spectrum = np.abs(np.fft.rfft(signal * np.hanning(len(signal)), size))
        total += np.where(allowed, spectrum, 0) / spectrum[allowed].max()

    freq = freqs[np.argmax(total)]
    period = 1 / freq
    offsets = []
    for signal in signals:
        phase = np.angle(np.sum(signal * np.exp(-2j * np.pi * freq * np.arange(len(signal)))))
        offsets.append((-phase / (2 * np.pi) * period + 1) % period)

    return period, offsets


def cell_indices(length, period, offset):
    cells = np.floor((np.arange(length) - offset) / period).astype(int)

    return cells - cells.min()


def fit(src, width=None, height=None, alpha_threshold=160, without=()):
    palette = load_palette()
    excluded = {hex_.upper() for hex_ in without}
    palette = palette[[to_hex(c) not in excluded for c in palette]]
    rgba = np.array(Image.open(src).convert("RGBA"))
    opaque = rgba[..., 3] >= alpha_threshold

    ys, xs = np.nonzero(opaque)
    if len(xs) == 0:
        raise SystemExit(f"{src}: нет ни одного непрозрачного пикселя")
    top, bottom, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba, opaque = rgba[top:bottom, left:right], opaque[top:bottom, left:right]
    h, w = opaque.shape

    index = nearest_index(rgba[..., :3].reshape(-1, 3), palette).reshape(h, w)

    if width:
        height = height or round(h * width / w)
        cx = np.minimum((np.arange(w) * width) // w, width - 1)
        cy = np.minimum((np.arange(h) * height) // h, height - 1)
        grid = f"задан вручную: {width}×{height}"
    else:
        lightness = np.where(opaque, palette[index].mean(-1), 0).astype(float)
        period, (ox, oy) = estimate_grid(
            [
                np.abs(np.diff(lightness, axis=1)).sum(0),
                np.abs(np.diff(lightness, axis=0)).sum(1),
            ]
        )
        cx, cy = cell_indices(w, period, ox), cell_indices(h, period, oy)
        grid = f"найдена сама: клетка {period:.2f}"

    n = len(palette)
    nw, nh = cx.max() + 1, cy.max() + 1
    classes = np.where(opaque, index, n)
    keys = (cy[:, None] * nw + cx[None, :]) * (n + 1) + classes
    counts = np.bincount(keys.ravel(), minlength=nh * nw * (n + 1)).reshape(nh, nw, n + 1)

    transparent = counts[..., n] * 2 > counts.sum(-1)
    best = counts[..., :n].argmax(-1)

    out = np.zeros((nh, nw, 4), dtype=np.uint8)
    out[..., :3] = palette[best]
    out[..., 3] = np.where(transparent, 0, 255)

    ys, xs = np.nonzero(out[..., 3])
    out = out[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]

    return out, grid


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("src")
    parser.add_argument("out")
    parser.add_argument("--width", type=int, help="ширина результата в пикселях сцены")
    parser.add_argument("--height", type=int, help="высота результата (по умолчанию по пропорции)")
    parser.add_argument("--alpha", type=int, default=160, help="порог непрозрачности 0–255")
    parser.add_argument("--without", nargs="+", default=[], metavar="HEX", help="цвета палитры, которых в этой вещи быть не должно")
    args = parser.parse_args()

    out, grid = fit(args.src, args.width, args.height, args.alpha, args.without)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGBA").save(args.out)

    visible = out[out[..., 3] == 255][:, :3]
    used = {to_hex(c) for c in np.unique(visible, axis=0)}
    print(f"{args.out}: {out.shape[1]}×{out.shape[0]}, сетка {grid}, цветов {len(used)}: {' '.join(sorted(used))}")


if __name__ == "__main__":
    main()
