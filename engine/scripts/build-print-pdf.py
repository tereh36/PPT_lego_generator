#!/usr/bin/env python3
"""
build-print-pdf.py content/<topic>.json

Собирает сопроводительный PDF для печати строго по структуре из
DESIGN_SYSTEM.md (5 страниц, Letter-формат, portrait):
  1. Story Props (с подписями, единственная страница с текстом на картинках)
  2. Story Background (full-bleed, без подписей, авто-поворот если горизонтальная)
  3. Full Story Script (for the Teacher) — Short Summary / Materials / Full Story / Observation
  4. Game printout (без текста)
  5. Pattern Sheet (~90% размера, по букве темы)

Правило: картинки — те же файлы, что в презентации, contain-fit, без
собственной обрезки. Высота Frame под заголовки — с большим запасом
(силент-дроп в reportlab иначе теряет текст без ошибки).
"""
import sys
import os
import json

# защита от падения на Windows-консолях с не-UTF8 кодировкой (cp1252 и т.п.)
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image

PAGE_W, PAGE_H = letter  # 612 x 792 pt, portrait — NEVER change orientation
RED = (0xD0 / 255, 0x33 / 255, 0x31 / 255)
DARKGRAY = (0x40 / 255, 0x40 / 255, 0x40 / 255)
GRAY = (0x88 / 255, 0x88 / 255, 0x88 / 255)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def page_header(c, title):
    c.setFont("Helvetica-Bold", 20)
    c.setFillColorRGB(*DARKGRAY)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 50, title)
    c.setStrokeColorRGB(*RED)
    c.setLineWidth(2)
    c.line(50, PAGE_H - 62, 562, PAGE_H - 62)


def contain_fit_box(img_path, box_x, box_y, box_w, box_h):
    """Возвращает (x, y, w, h) для вставки картинки с сохранением пропорций внутри box."""
    with Image.open(img_path) as im:
        iw, ih = im.size
    scale = min(box_w / iw, box_h / ih)
    w, h = iw * scale, ih * scale
    x = box_x + (box_w - w) / 2
    y = box_y + (box_h - h) / 2
    return x, y, w, h


def draw_image_contain(c, img_path, box_x, box_y, box_w, box_h):
    if not os.path.exists(img_path):
        return
    x, y, w, h = contain_fit_box(img_path, box_x, box_y, box_w, box_h)
    c.drawImage(ImageReader(img_path), x, y, width=w, height=h, preserveAspectRatio=True, mask="auto")


def page1_story_props(c, content, props_dir):
    page_header(c, "Story Props - Cut Out & Use During Storytelling")
    props = content["story_props"]
    n = len(props)
    cols = min(n, 3)
    rows = (n + cols - 1) // cols
    margin = 50
    cell_w = (PAGE_W - 2 * margin) / cols
    cell_h = (PAGE_H - 160) / rows
    for i, prop in enumerate(props):
        col, row = i % cols, i // cols
        x = margin + col * cell_w
        y = PAGE_H - 100 - (row + 1) * cell_h
        slug = prop["name"].lower().replace(" ", "_")
        img_path = os.path.join(props_dir, f"{slug}.png")
        draw_image_contain(c, img_path, x + 10, y + 30, cell_w - 20, cell_h - 40)
        c.setFont("Helvetica", 11)
        c.setFillColorRGB(0, 0, 0)
        c.drawCentredString(x + cell_w / 2, y + 12, prop["name"])
    c.setFont("Helvetica-Oblique", 10)
    c.setFillColorRGB(*GRAY)
    c.drawCentredString(PAGE_W / 2, 40, "Print, cut out, and use as hand props while telling the story.")
    c.showPage()


def page2_story_background(c, gen_dir):
    img_path = os.path.join(gen_dir, "story_background.png")
    if not os.path.exists(img_path):
        draw_image_contain(c, img_path, 0, 0, PAGE_W, PAGE_H)
        c.showPage()
        return
    with Image.open(img_path) as im:
        iw, ih = im.size
    # если горизонтальная - поворачиваем саму картинку на 90 (не страницу)
    if iw > ih:
        rotated_path = img_path.replace(".png", "_rot90.png")
        with Image.open(img_path) as im:
            im.rotate(-90, expand=True).save(rotated_path)
        img_path = rotated_path
    with Image.open(img_path) as im:
        iw, ih = im.size
    # full-bleed: заполняем всю страницу, обрезка по краям допустима, без искажений
    scale = max(PAGE_W / iw, PAGE_H / ih)
    w, h = iw * scale, ih * scale
    x, y = (PAGE_W - w) / 2, (PAGE_H - h) / 2
    c.drawImage(ImageReader(img_path), x, y, width=w, height=h, preserveAspectRatio=True)
    c.showPage()


def draw_wrapped_paragraph(c, text, x, y, max_width, font="Helvetica", size=11, leading=14):
    """Простой построчный перенос текста; возвращает новый y."""
    c.setFont(font, size)
    words = text.split()
    line = ""
    for word in words:
        test = (line + " " + word).strip()
        if c.stringWidth(test, font, size) > max_width:
            c.drawString(x, y, line)
            y -= leading
            line = word
        else:
            line = test
    if line:
        c.drawString(x, y, line)
        y -= leading
    return y


def page3_full_story(c, content, has_images=True):
    page_header(c, "Full Story Script (for the Teacher)")
    x, w = 50, 512
    y = PAGE_H - 100

    def section(title):
        nonlocal y
        c.setFont("Helvetica-Bold", 13)
        c.setFillColorRGB(*RED)
        c.drawString(x, y, title)
        y -= 20
        c.setFillColorRGB(0, 0, 0)

    section("Short Summary")
    y = draw_wrapped_paragraph(c, content["story"]["short_summary"], x, y, w)
    y -= 15

    section("Materials")
    c.setFont("Helvetica", 11)
    bg_note = "Background: printed story background scene (see page 2)" if has_images else "Background: story background illustration (generate separately)"
    c.drawString(x, y, bg_note)
    y -= 16
    c.drawString(x, y, "Characters: " + ", ".join(content["story"]["characters"]))
    y -= 16
    y = draw_wrapped_paragraph(c, "Objects: " + ", ".join(p["name"] for p in content["story_props"]), x, y, w)
    y -= 15

    section("Full Story")
    for para in content["story"]["full_story_speaker_notes"].split(". "):
        if not para.strip():
            continue
        y = draw_wrapped_paragraph(c, para.strip().rstrip(".") + ".", x, y, w)
        if y < 120:
            c.showPage()
            y = PAGE_H - 80
    y -= 15

    if y < 150:
        c.showPage()
        y = PAGE_H - 80
    section("Observation")
    for q in content["story"]["observation_questions"]:
        y = draw_wrapped_paragraph(c, "- " + q, x, y, w)
    c.showPage()


def page4_game_printout(c, gen_dir, content):
    game2 = content.get("game2", {})
    colors = game2.get("colors", [])
    if not colors:
        c.showPage()
        return
    n = len(colors)
    cols = min(n, 4)
    rows = (n + cols - 1) // cols
    margin = 40
    cell_w = (PAGE_W - 2 * margin) / cols
    cell_h = (PAGE_H - 2 * margin) / rows
    for i, color in enumerate(colors):
        col, row = i % cols, i // cols
        x = margin + col * cell_w
        y = PAGE_H - margin - (row + 1) * cell_h
        img_path = os.path.join(gen_dir, f"game2_{color.lower()}.png")
        draw_image_contain(c, img_path, x + 8, y + 8, cell_w - 16, cell_h - 16)
    c.showPage()


def page5_pattern_sheet(c, content):
    letter = content["letter"].upper()
    c.setFont("Helvetica-Bold", 16)
    c.setFillColorRGB(*DARKGRAY)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 60, f"Build the Letter {letter} - Brick Pattern")
    img_path = os.path.join(ROOT, "assets", "letters", f"{letter}_pattern.png")
    # ~90% максимального размера, центрирована
    box_w, box_h = (PAGE_W - 100) * 0.9, (PAGE_H - 160) * 0.9
    box_x = (PAGE_W - box_w) / 2
    box_y = (PAGE_H - 160 - box_h) / 2 + 40
    draw_image_contain(c, img_path, box_x, box_y, box_w, box_h)
    c.showPage()


def main():
    if len(sys.argv) < 2:
        print("Usage: build-print-pdf.py content/<topic>.json")
        sys.exit(1)
    content = json.load(open(sys.argv[1], encoding="utf-8"))
    slug = content["topic"].lower().replace(" ", "_")
    data_dir = os.environ.get("BRICK_DATA_DIR", ROOT)
    gen_dir = os.path.join(data_dir, "assets", "generated", slug)
    props_dir = gen_dir
    out_dir = os.path.join(data_dir, "output")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{slug}_printables.pdf")

    # "текстовый режим": нет API-ключа -> нет AI-картинок -> есть смысл собрать
    # только страницу с полной историей (остальные 4 страницы без картинок бесполезны)
    has_images = os.path.exists(os.path.join(gen_dir, "story_background.png"))

    c = canvas.Canvas(out_path, pagesize=letter)
    if has_images:
        page1_story_props(c, content, props_dir)
        page2_story_background(c, gen_dir)
        page3_full_story(c, content)
        page4_game_printout(c, gen_dir, content)
        page5_pattern_sheet(c, content)
    else:
        print("No images found (no API key) - building story-only page.")
        page3_full_story(c, content, has_images=False)
    c.save()
    print("Written:", out_path)

    # verify with pdfplumber that expected text is actually present (silent-drop guard)
    import pdfplumber
    with pdfplumber.open(out_path) as pdf:
        all_text = "\n".join(p.extract_text() or "" for p in pdf.pages)
        expected = ["Full Story Script"] if not has_images else ["Story Props", "Full Story Script", content["letter"].upper()]
        for e in expected:
            if e not in all_text:
                print(f"WARNING: expected text '{e}' not found in rendered PDF (possible silent-drop).")


if __name__ == "__main__":
    main()
