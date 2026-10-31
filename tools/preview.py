"""Показывает спрайт в кадре 320×180, увеличенный без сглаживания.

Фон — любая картинка 320×180 (например, референс, приведённый к палитре).
Спрайт ставится в точку --at X,Y (левый верхний угол, в пикселях сцены).

Пример:
  python tools/preview.py assets/sprites/terminal.png assets/_preview/terminal.png --background assets/_preview/mood.png --at 6,74
"""

import argparse
from pathlib import Path

from PIL import Image

SCENE = (320, 180)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("sprite")
    parser.add_argument("out")
    parser.add_argument("--background", help="фон 320×180; без него — #1B1B1B")
    parser.add_argument("--at", default="0,0", help="X,Y левого верхнего угла спрайта")
    parser.add_argument("--scale", type=int, default=4)
    args = parser.parse_args()

    scene = (
        Image.open(args.background).convert("RGBA").resize(SCENE, Image.NEAREST)
        if args.background
        else Image.new("RGBA", SCENE, "#1B1B1B")
    )
    sprite = Image.open(args.sprite).convert("RGBA")
    x, y = (int(v) for v in args.at.split(","))
    scene.alpha_composite(sprite, (x, y))

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    scene.resize((SCENE[0] * args.scale, SCENE[1] * args.scale), Image.NEAREST).save(args.out)
    print(args.out)


if __name__ == "__main__":
    main()
