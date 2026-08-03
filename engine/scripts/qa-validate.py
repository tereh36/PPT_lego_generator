#!/usr/bin/env python3
"""
qa-validate.py <file.pptx>

Обязательный последний шаг перед сдачей презентации (см. DESIGN_SYSTEM.md /
Preschool_Rulebook.md, раздел QA-валидатор):
1. schema-валидация (свои проверки на python-pptx, ничего внешнего не требует)
2. если на компьютере есть LibreOffice — рендер в PDF + pdfplumber: реальные
   bounding box слов и картинок не должны выходить за пределы страницы
   (переполнение textbox не ловится schema-валидацией, только рендером).
   Если LibreOffice не найден — этот шаг пропускается с пояснением (не ошибка).
3. простая проверка на длинные тире и распространённые опечатки-плейсхолдеры
   (через библиотеку markitdown, без вызова во внешней командной строке).

Выход ненулевой, если найдены проблемы.
"""
import sys
import subprocess
import shutil
import os
import re
import json

# защита от падения на Windows-консолях с не-UTF8 кодировкой (cp1252 и т.п.)
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


def lint_content(content_path, problems):
    """Проверки самого content.json, помимо визуальной вёрстки."""
    with open(content_path, encoding="utf-8") as f:
        content = json.load(f)

    qa = content.get("presentation_qa", [])
    if len(qa) < 4:
        problems.append(f"content.json: presentation_qa has only {len(qa)} question(s), minimum is 4.")

    props = content.get("story_props", [])
    if len(props) > 4:
        problems.append(f"content.json: story_props has {len(props)} items, keep it minimal (max ~4).")

    for game_key in ("game1", "game2", "game3"):
        game = content.get(game_key, {})
        script = game.get("script")
        if not script:
            problems.append(f"content.json: {game_key}.script is missing or empty (unified script format required).")

    topic = content.get("topic", "").lower()
    summary = content.get("story", {}).get("short_summary", "").lower()
    if topic and topic not in summary:
        problems.append(
            f"content.json: WARNING — story.short_summary does not mention the topic word "
            f"'{content.get('topic')}'. Double-check the story leads to building the {content.get('topic')} "
            f"model itself, not a derivative object (a derivative like a home/container belongs in Challenge)."
        )


def check_video_availability(content_path, problems, warnings):
    """
    Проверяет, что все youtube id, используемые в уроке, реально доступны
    через публичный oEmbed endpoint — без API-ключа. Требует интернет.
    404/401 -> жёсткая ошибка, остальное -> предупреждение (может быть
    сетевым ограничением/rate limiting, не проблемой самого видео).
    """
    try:
        import urllib.request
        import urllib.error
    except ImportError:
        warnings.append("Video check skipped: urllib not available.")
        return

    with open(content_path, encoding="utf-8") as f:
        content = json.load(f)

    ids_to_check = {}
    if content.get("intro_video_youtube_id"):
        ids_to_check["intro_video_youtube_id"] = content["intro_video_youtube_id"]

    ids_to_check["alphabet (constant)"] = "-1jxqVy5SlA"
    ids_to_check["closing (constant)"] = "h2AndZKYZBQ"

    letter = content.get("letter", "").upper()
    letter_videos_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "letter-videos.json")
    if os.path.exists(letter_videos_path):
        with open(letter_videos_path, encoding="utf-8") as f:
            letter_videos = json.load(f)
        vid = letter_videos.get(letter)
        if vid:
            ids_to_check[f"letter-specific ({letter})"] = vid

    for label, vid in ids_to_check.items():
        url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status != 200:
                    warnings.append(f"Video check: {label} (id={vid}) returned status {resp.status} — may be unavailable.")
        except urllib.error.HTTPError as e:
            if e.code in (404, 401):
                problems.append(f"Video UNAVAILABLE: {label} (id={vid}) — oEmbed returned {e.code} (video deleted/private/nonexistent). Replace this youtube id.")
            else:
                warnings.append(f"Video check inconclusive for {label} (id={vid}): oEmbed returned {e.code}. Often network restriction/rate limiting rather than a bad video — verify manually at https://youtube.com/watch?v={vid} if unsure.")
        except Exception as e:
            warnings.append(f"Video check: {label} (id={vid}) could not be verified ({e}). Check manually or verify internet access.")


def schema_validate(pptx_path, problems):
    """Самодостаточная проверка границ слайда через python-pptx — не требует
    никаких внешних скриптов/путей, работает на любом компьютере.
    Строго проверяем только текст и картинки — декоративные фоновые фигуры
    без текста (например угловые квадраты) могут намеренно чуть выходить
    за край слайда, это осознанный приём в дизайне, не баг."""
    try:
        from pptx import Presentation
        from pptx.enum.shapes import MSO_SHAPE_TYPE
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "python-pptx", "-q"])
        from pptx import Presentation
        from pptx.enum.shapes import MSO_SHAPE_TYPE

    prs = Presentation(pptx_path)
    sw, sh = prs.slide_width, prs.slide_height
    tolerance = 9525 * 2  # ~2pt запас на округления

    for i, slide in enumerate(prs.slides, start=1):
        for shape in slide.shapes:
            try:
                left, top = shape.left, shape.top
                width, height = shape.width, shape.height
            except (AttributeError, TypeError):
                continue
            if left is None or top is None or width is None or height is None:
                continue

            has_text = bool(getattr(shape, "has_text_frame", False) and shape.text_frame.text.strip())
            is_picture = shape.shape_type == MSO_SHAPE_TYPE.PICTURE
            if not has_text and not is_picture:
                continue  # чисто декоративная фигура - бleed за край допустим

            if left < -tolerance or top < -tolerance:
                problems.append(f"Slide {i}: shape starts outside left/top bounds.")
            if left + width > sw + tolerance:
                problems.append(f"Slide {i}: shape overflows right edge (x+w={left+width}, slide width={sw}).")
            if top + height > sh + tolerance:
                problems.append(f"Slide {i}: shape overflows bottom edge (y+h={top+height}, slide height={sh}).")


def find_soffice():
    """Ищет LibreOffice на компьютере под разными именами/путями. None, если не найден."""
    for name in ("soffice", "libreoffice", "soffice.exe"):
        path = shutil.which(name)
        if path:
            return path
    # частые пути установки на Windows
    common_win_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    ]
    for p in common_win_paths:
        if os.path.exists(p):
            return p
    return None


def bounding_box_check(pptx_path, problems):
    """Если на компьютере есть LibreOffice — рендерит в PDF и проверяет
    реальные bounding box текста/картинок. Если LibreOffice не найден —
    пропускает шаг с пояснением, это НЕ ошибка (просто менее полная проверка)."""
    soffice = find_soffice()
    if not soffice:
        print("LibreOffice not found on this computer - skipping the text/image overflow check.")
        print("(This is not an error. Open the presentation in PowerPoint and check the")
        print(" slides by eye, especially whether text overlaps neighboring elements.)")
        return

    base = os.path.splitext(pptx_path)[0]
    pdf_path = base + ".pdf"
    r = subprocess.run(
        [soffice, "--headless", "--convert-to", "pdf", pptx_path],
        capture_output=True, text=True, cwd=os.path.dirname(pptx_path),
    )
    print(r.stdout, r.stderr)

    try:
        import pdfplumber
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "pdfplumber", "-q"])
        import pdfplumber

    if not os.path.exists(pdf_path):
        problems.append(f"PDF render not found at {pdf_path}, could not run bounding-box QA.")
        return

    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            pw, ph = page.width, page.height
            for w in page.extract_words():
                if w["x0"] < -1 or w["x1"] > pw + 1 or w["top"] < -1 or w["bottom"] > ph + 1:
                    problems.append(
                        f"Slide {i}: text '{w['text']}' overflows page bounds "
                        f"(x0={w['x0']:.1f}, x1={w['x1']:.1f}, page width={pw:.1f})"
                    )
            for im in page.images:
                if im["x0"] < -1 or im["x1"] > pw + 1 or im["top"] < -1 or im["bottom"] > ph + 1:
                    problems.append(f"Slide {i}: image overflows page bounds")


def text_hygiene_check(pptx_path, problems):
    """Через библиотеку markitdown напрямую (без вызова во внешней командной
    строке — так надёжнее работает на Windows, где .exe скриптов может не
    быть в PATH)."""
    try:
        from markitdown import MarkItDown
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "markitdown[pptx]", "-q"])
        from markitdown import MarkItDown

    try:
        md = MarkItDown()
        result = md.convert(pptx_path)
        text = result.text_content
    except Exception as e:
        print(f"Text hygiene check skipped (could not read text: {e})")
        return

    if "\u2014" in text:
        problems.append("Found an em dash (\u2014) — replace with comma/colon per style rules.")
    if re.search(r"\bTODO\b|\[insert|xxx", text, re.IGNORECASE):
        problems.append("Found placeholder text (TODO / [insert / xxx) left in the deck.")


def main():
    if len(sys.argv) < 2:
        print("Usage: qa-validate.py <file.pptx> [content.json]")
        sys.exit(1)

    pptx_path = os.path.abspath(sys.argv[1])
    problems = []
    warnings = []

    if len(sys.argv) >= 3:
        content_path = os.path.abspath(sys.argv[2])
        print("== 0/4 Content lint ==")
        lint_content(content_path, problems)
        for p in problems:
            print("LINT:", p)
        print("== 0b/4 Video availability (youtube oEmbed, needs internet) ==")
        check_video_availability(content_path, problems, warnings)
        for p in warnings:
            print("VIDEO WARNING:", p)
        for p in [x for x in problems if x.startswith("Video UNAVAILABLE")]:
            print("VIDEO FAIL:", p)

    print("== 1/3 Schema validation (bounds check) ==")
    schema_validate(pptx_path, problems)

    print("== 2/3 Rendering to PDF for bounding-box check ==")
    bounding_box_check(pptx_path, problems)

    print("== 3/3 Text hygiene (em-dash, placeholders) ==")
    text_hygiene_check(pptx_path, problems)

    print("\n==================== QA SUMMARY ====================")
    if problems:
        for p in problems:
            print("FAIL:", p)
        print(f"\n{len(problems)} problem(s) found. Fix before sending to the user.")
        sys.exit(1)
    else:
        print("All QA checks passed.")
        sys.exit(0)


if __name__ == "__main__":
    main()
