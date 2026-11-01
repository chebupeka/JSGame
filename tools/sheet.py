"""Режет кадры одного действия на клетки одинакового размера и собирает лист.

На входе — картинка, уже приведённая к палитре и к пикселям сцены
(tools/fit_palette.py ... --no-trim): в ней кадры стоят в ряд слева направо,
все в одном масштабе. Что делает скрипт:
1. Находит кадры как отдельные непрозрачные пятна (соседство по 8
   направлениям). Пятна, чьи столбцы перекрываются, — один кадр (рука,
   отделённая от тела, остаётся при своём кадре). Соринки меньше --speck
   пикселей выбрасываются. Если задан --frames, а кадров вышло больше,
   ближайшие соседи склеиваются, пока не станет столько, сколько надо;
   если меньше (кадры слиплись носками), самая широкая группа режется по
   самому пустому столбцу.
2. Ставит каждый кадр в клетку --cell (по умолчанию 24×40) так, чтобы его
   нижний ряд лёг на линию ног (--feet, по умолчанию 12,39), а середина
   встала на x ног. Середина считается по верхней пятой части фигуры
   (голова): у шагающей фигуры ноги и руки мотаются, рука тянется к ручке,
   а голова идёт ровно, поэтому кадры не дрожат. --center bbox — по рамке
   целиком. --center slot — исходник делится на N равных слотов, и середина
   слота встаёт на x ног: так сохраняется сдвиг, нарисованный в кадрах
   намеренно (наклон, перенос веса), если кадры разложены с ровным шагом.
   --baseline common — вместо нижнего ряда каждого кадра общий нижний ряд
   всех кадров (кадры сохраняют свою высоту над полом, например прыжок).
3. Пишет лист PNG (кадры слева направо) и рядом JSON:
   {"cell": [24, 40], "feet": [12, 39], "frames": N}.

Пример:
  python tools/fit_palette.py assets/_raw/girl/walk-v1-2.png assets/_raw/girl/walk-fit.png --no-trim
  python tools/sheet.py assets/_raw/girl/walk-fit.png assets/_preview/girl/girl-walk.png --frames 6
  python tools/sheet.py assets/_raw/girl/strip-walk.png assets/_preview/girl/girl-walk.png --frames 6 --center slot
  (второе — полоса кадров, нарисованных руками в клетках 24×40: кадры не сдвигаются)
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

import palette  # noqa: F401 — печать «×» в консоли Windows

# Ошибки (SystemExit) идут в stderr, а он в консоли Windows тоже не UTF-8.
sys.stderr.reconfigure(encoding="utf-8")


def label_blobs(opaque):
    """Метки связных непрозрачных пятен (соседство по 8 направлениям)."""
    h, w = opaque.shape
    labels = np.zeros((h, w), dtype=np.int32)
    count = 0
    for y, x in zip(*np.nonzero(opaque)):
        if labels[y, x]:
            continue
        count += 1
        labels[y, x] = count
        stack = [(y, x)]
        while stack:
            cy, cx = stack.pop()
            for ny in range(max(cy - 1, 0), min(cy + 2, h)):
                for nx in range(max(cx - 1, 0), min(cx + 2, w)):
                    if opaque[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = count
                        stack.append((ny, nx))

    return labels, count


def find_frames(opaque, speck, frames=None):
    """Кадры как маски непрозрачных пикселей, слева направо."""
    labels, count = label_blobs(opaque)
    blobs = []
    for label in range(1, count + 1):
        mask = labels == label
        xs = np.nonzero(mask.any(0))[0]
        if np.count_nonzero(mask) >= speck:
            blobs.append({"mask": mask, "left": xs.min(), "right": xs.max()})

    # Пятна, чьи столбцы перекрываются, — части одного кадра.
    blobs.sort(key=lambda b: b["left"])
    groups = []
    for blob in blobs:
        if groups and blob["left"] <= groups[-1]["right"]:
            groups[-1]["mask"] = groups[-1]["mask"] | blob["mask"]
            groups[-1]["right"] = max(groups[-1]["right"], blob["right"])
        else:
            groups.append(dict(blob))

    if frames:
        # Слипшиеся кадры (носок одного залез под пятку другого) — режем
        # самую широкую группу по самому пустому столбцу в её середине.
        while len(groups) < frames:
            i = max(range(len(groups)), key=lambda k: groups[k]["right"] - groups[k]["left"])
            group = groups[i]
            left, right = group["left"], group["right"]
            middle = range(left + (right - left) // 4, right - (right - left) // 4 + 1)
            column = min(middle, key=lambda x: (np.count_nonzero(group["mask"][:, x]), abs(x - (left + right) / 2)))
            cut = np.arange(opaque.shape[1]) < column
            parts = [group["mask"] & cut, group["mask"] & ~cut]
            if not all(part.any() for part in parts):
                raise SystemExit(f"нашлось {len(groups)} кадров, а нужно {frames}: не получается разрезать")
            groups[i : i + 1] = [
                {"mask": part, "left": np.nonzero(part.any(0))[0].min(), "right": np.nonzero(part.any(0))[0].max()}
                for part in parts
            ]
            print(f"  кадры слиплись: разрезаны по столбцу {column}")

        # Лишние пятна (отлетевшая прядь, тень) — к ближайшему соседу.
        while len(groups) > frames:
            gaps = [groups[i + 1]["left"] - groups[i]["right"] for i in range(len(groups) - 1)]
            i = int(np.argmin(gaps))
            groups[i]["mask"] = groups[i]["mask"] | groups[i + 1]["mask"]
            groups[i]["right"] = groups[i + 1]["right"]
            del groups[i + 1]

    return [g["mask"] for g in groups]


def place(rgba, mask, cell, feet, bottom, center):
    """Кадр в клетке: нижний ряд bottom → feet[1], середина → feet[0].

    center — способ найти середину или готовая середина числом (слот)."""
    ys, xs = np.nonzero(mask)
    top, left, right = ys.min(), xs.min(), xs.max()

    if not isinstance(center, str):
        middle = center
    elif center == "bbox":
        middle = (left + right) / 2
    else:
        head = ys <= top + (bottom - top) / 5
        middle = (xs[head].min() + xs[head].max()) / 2

    dx = feet[0] - int(np.floor(middle + 0.5))
    dy = feet[1] - bottom
    out = np.zeros((cell[1], cell[0], 4), dtype=np.uint8)
    ty, tx = ys + dy, xs + dx
    inside = (tx >= 0) & (tx < cell[0]) & (ty >= 0) & (ty < cell[1])
    out[ty[inside], tx[inside]] = rgba[ys[inside], xs[inside]]
    lost = int(np.count_nonzero(~inside))

    return out, (right - left + 1, bottom - top + 1), lost


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("src", help="картинка с кадрами в ряд, уже в палитре и в пикселях сцены")
    parser.add_argument("out", help="лист PNG; JSON пишется рядом")
    parser.add_argument("--frames", type=int, help="сколько кадров должно получиться")
    parser.add_argument("--cell", default="24,40", help="размер клетки W,H")
    parser.add_argument("--feet", default="12,39", help="точка ног в клетке X,Y")
    parser.add_argument("--speck", type=int, default=4, help="пятна меньше стольких пикселей — соринки")
    parser.add_argument("--center", choices=["head", "bbox", "slot"], default="head", help="по чему ставить кадр на середину")
    parser.add_argument("--baseline", choices=["frame", "common"], default="frame", help="линия ног: низ каждого кадра или общий низ")
    args = parser.parse_args()

    cell = tuple(int(v) for v in args.cell.split(","))
    feet = tuple(int(v) for v in args.feet.split(","))
    rgba = np.array(Image.open(args.src).convert("RGBA"))
    soft = np.count_nonzero((rgba[..., 3] > 0) & (rgba[..., 3] < 255))
    if soft:
        raise SystemExit(f"{args.src}: {soft} полупрозрачных пикселей — сначала tools/fit_palette.py")

    masks = find_frames(rgba[..., 3] == 255, args.speck, args.frames)
    common = max(np.nonzero(m)[0].max() for m in masks)

    sheet = np.zeros((cell[1], cell[0] * len(masks), 4), dtype=np.uint8)
    for i, mask in enumerate(masks):
        bottom = common if args.baseline == "common" else np.nonzero(mask)[0].max()
        center = args.center
        if center == "slot":
            slot = rgba.shape[1] / len(masks)
            center = slot * i + slot / 2 - 0.5
        framed, (w, h), lost = place(rgba, mask, cell, feet, bottom, center)
        sheet[:, i * cell[0] : (i + 1) * cell[0]] = framed
        warning = f", НЕ ВЛЕЗЛО {lost} пикселей" if lost else ""
        print(f"  кадр {i}: {w}×{h}{warning}")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(sheet, "RGBA").save(out)
    sidecar = out.with_suffix(".json")
    sidecar.write_text(
        json.dumps({"cell": list(cell), "feet": list(feet), "frames": len(masks)}) + "\n",
        encoding="utf-8",
    )
    print(f"{out}: {len(masks)} кадров по {cell[0]}×{cell[1]} → {sidecar}")


if __name__ == "__main__":
    main()
