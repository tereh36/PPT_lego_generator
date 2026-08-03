#!/usr/bin/env python3
"""
recolor-game2.py <content.json>

Правило из DESIGN_SYSTEM.md: для цветных вариантов одной и той же картинки
(matching-игра) НЕ рисовать заново, а взять реальную картинку (например
story prop) и перекрасить через HSV hue-shift, сохранив форму и светотень.

Берёт content.game2.base_prop_image (имя файла без папки, ищет в
assets/story_props/<topic>/), сдвигает оттенок под каждый цвет из
content.game2.colors и сохраняет в assets/generated/<topic>/game2_<color>.png
— именно там, где их ждёт build-pptx.js.
"""
import sys
import os
import json
import numpy as np
from PIL import Image
from collections import Counter

TARGET_HUE = {  # 0-360 градусов, приблизительно под палитру DESIGN_SYSTEM.md
    "RED": 5, "BLUE": 205, "GREEN": 100, "PURPLE": 290,
    "YELLOW": 50, "TEAL": 190, "ORANGE": 30,
}

def dominant_hue(img_rgb):
    hsv = img_rgb.convert("HSV")
    arr = np.array(hsv)
    h, s, v = arr[..., 0], arr[..., 1], arr[..., 2]
    mask = (s > 60) & (v > 40) & (v < 250)  # насыщенные не-белые не-чёрные пиксели
    if mask.sum() == 0:
        return 0
    hues = h[mask]
    most_common = Counter(hues.tolist()).most_common(1)[0][0]
    return most_common / 255.0 * 360.0

def hue_shift(img_rgb, delta_deg):
    hsv = img_rgb.convert("HSV")
    arr = np.array(hsv).astype(np.int16)
    delta_255 = int(round(delta_deg / 360.0 * 255))
    arr[..., 0] = (arr[..., 0] + delta_255) % 256
    return Image.fromarray(arr.astype(np.uint8), mode="HSV").convert("RGBA")

def main():
    if len(sys.argv) < 2:
        print("Usage: recolor-game2.py content/<topic>.json")
        sys.exit(1)
    content = json.load(open(sys.argv[1], encoding="utf-8"))
    slug = content["topic"].lower().replace(" ", "_")
    game2 = content.get("game2", {})
    colors = game2.get("colors", [])
    base_name = game2.get("base_prop_image")
    if not base_name or not colors:
        print("content.game2.base_prop_image or .colors missing, nothing to do.")
        return

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    base_path = os.path.join(root, "assets", "story_props", slug, f"{base_name}.png")
    if not os.path.exists(base_path):
        print(f"Base image not found: {base_path}. Generate story props first.")
        sys.exit(1)

    img = Image.open(base_path).convert("RGB")
    src_hue = dominant_hue(img)
    out_dir = os.path.join(root, "assets", "generated", slug)
    os.makedirs(out_dir, exist_ok=True)

    for color in colors:
        target = TARGET_HUE.get(color.upper())
        if target is None:
            print(f"Unknown color {color}, skipping (add it to TARGET_HUE).")
            continue
        delta = target - src_hue
        recolored = hue_shift(img, delta)
        out_path = os.path.join(out_dir, f"game2_{color.lower()}.png")
        recolored.save(out_path)

        # verify
        check_hue = dominant_hue(recolored.convert("RGB"))
        diff = min(abs(check_hue - target), 360 - abs(check_hue - target))
        status = "OK" if diff < 15 else f"WARNING diff={diff:.0f} deg"
        print(f"{color}: saved {out_path} ({status})")

if __name__ == "__main__":
    main()
