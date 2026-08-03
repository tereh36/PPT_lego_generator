/**
 * build-pptx.js
 * Собирает готовую презентацию урока из content/<topic>.json + assets/*
 * Все координаты и стили — 1:1 из DESIGN_SYSTEM.md, ничего не придумывается заново.
 *
 * Запуск:  node scripts/build-pptx.js content/umbrella.json
 * Результат: output/<topic>.pptx
 */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");

// ---------- палитра и константы (DESIGN_SYSTEM.md) ----------
const COLORS = {
  RED: "D03331",
  BLUE: "3095D4",
  GREEN: "6FC141",
  PURPLE: "A441C2",
  YELLOW: "FCD900",
  TEAL: "0097A7",
};
const EXTRA_COLORS = {
  ORANGE: "F5811F",
  BROWN: "8B5A2B",
  PINK: "F48FB1",
  BLACK: "333333",
  WHITE: "FFFFFF",
  GRAY: "888888",
  GREY: "888888",
};
function resolveColorHex(name) {
  const key = (name || "").toUpperCase();
  return COLORS[key] || EXTRA_COLORS[key] || "AAAAAA";
}
function isLightColor(hex) {
  const r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}
const CYCLE = ["RED", "BLUE", "GREEN", "PURPLE", "YELLOW", "TEAL"];
const DARKGRAY = "404040";
const FONT = "Arial";

const EMU = (v) => v / 914400; // EMU -> inches

const CONST_VIDEOS = {
  alphabet: { id: "ezmsrB59mj8", caption: "Alphabet Song" },
};

// letter-specific video ids, заполняется один раз пользователем
let LETTER_VIDEOS = {};
const letterVideoPath = path.join(__dirname, "letter-videos.json");
if (fs.existsSync(letterVideoPath)) {
  LETTER_VIDEOS = JSON.parse(fs.readFileSync(letterVideoPath, "utf8"));
}

// ---------- декоративные наборы квадратов (координаты как есть, EMU) ----------
const STYLE_A = [
  [11431829, 4573829, 760781, 1516990, "PURPLE"], [11431829, 0, 760781, 760781, "RED"],
  [10686593, 0, 760781, 760781, "RED"], [9932213, 0, 760781, 760781, "YELLOW"],
  [9177833, 0, 760781, 760781, "YELLOW"], [0, 5334610, 760781, 760781, "YELLOW"],
  [1829, 0, 760781, 760781, "BLUE"], [755294, 0, 760781, 760781, "BLUE"],
  [1829, 6090818, 760781, 760781, "GREEN"], [755294, 6090818, 760781, 760781, "GREEN"],
  [1506017, 6090818, 760781, 760781, "GREEN"], [11431829, 6090818, 760781, 760781, "BLUE"],
];
const STYLE_B = [
  [11430914, 0, 760781, 760781, "BLUE"], [11431829, 747979, 760781, 760781, "PURPLE"],
  [11430914, 1508760, 760781, 760781, "YELLOW"], [0, 6101791, 3004718, 760781, "RED"],
  [0, 5341010, 760781, 760781, "BLUE"], [11431829, 6090818, 760781, 760781, "GREEN"],
  [10699394, 6090818, 760781, 760781, "GREEN"], [0, 0, 760781, 760781, "PURPLE"],
];
const STYLE_MARKER = [
  [0, -1829, 760781, 760781, "BLUE"], [747979, -1829, 2282342, 760781, "GREEN"],
  [0, 2304288, 760781, 760781, "GREEN"], [757123, 5339182, 760781, 1517904, "PURPLE"],
  [0, 758952, 1530706, 760781, "PURPLE"], [0, 3821278, 760781, 760781, "RED"],
  [0, 3065069, 1530706, 760781, "YELLOW"], [1517904, 6099962, 2277770, 758952, "YELLOW"],
  [0, 4582058, 760781, 2275942, "BLUE"],
];
const STYLE_CLEANUP = [
  [2240280, 4511650, 760781, 760781, "YELLOW"], [4517136, 3763670, 760781, 760781, "RED"],
  [747979, -1829, 2282342, 760781, "GREEN"], [0, -1829, 760781, 760781, "YELLOW"],
  [3030322, -1829, 760781, 760781, "PURPLE"], [3780130, -1829, 760781, 760781, "PURPLE"],
  [0, 758952, 760781, 760781, "BLUE"], [753466, 758952, 760781, 760781, "BLUE"],
  [1506931, 758952, 760781, 760781, "BLUE"], [0, 1506931, 760781, 760781, "PURPLE"],
  [0, 2267712, 760781, 760781, "GREEN"], [753466, 2267712, 760781, 760781, "BLUE"],
  [1506931, 2267712, 760781, 760781, "BLUE"], [0, 3015691, 760781, 760781, "RED"],
  [753466, 3015691, 760781, 760781, "RED"], [1506017, 3015691, 760781, 760781, "RED"],
  [2253996, 3015691, 760781, 760781, "RED"], [3001061, 2267712, 760781, 3004718, "BLUE"],
  [3761842, 3763670, 760781, 1508760, "PURPLE"], [0, 5334610, 760781, 760781, "YELLOW"],
  [755294, 6090818, 760781, 760781, "GREEN"], [1506017, 6090818, 760781, 760781, "GREEN"],
  [0, 6090818, 760781, 760781, "YELLOW"], [2253996, 6090818, 760781, 760781, "GREEN"],
];
const STYLE_WRAPUP = [
  // 16 фигур, бело-цветная мозаика справа; один элемент намеренно выходит за край (оригинальный дизайн)
  [10700000, 0, 760781, 760781, "GREEN"], [11431829, 0, 760781, 760781, "YELLOW"],
  [10700000, 747979, 760781, 760781, "PURPLE"], [11431829, 747979, 760781, 760781, "BLUE"],
  [10700000, 1508760, 760781, 760781, "YELLOW"], [11431829, 1508760, 760781, 760781, "GREEN"],
  [10700000, 2256739, 760781, 760781, "BLUE"], [11431829, 2256739, 760781, 760781, "PURPLE"],
  [10700000, 5334610, 760781, 760781, "YELLOW"], [11431829, 5334610, 760781, 760781, "GREEN"],
  [10700000, 6090818, 760781, 760781, "GREEN"], [11431829, 6090818, 760781, 760781, "YELLOW"],
  [0, 0, 760781, 760781, "PURPLE"], [0, 6090818, 760781, 760781, "BLUE"],
  [755294, 0, 760781, 760781, "BLUE"], [12192000, 6090818, 760781, 760781, "PURPLE"], // выходит за край - оригинальный дизайн
];

function addDecor(slide, set) {
  set.forEach(([x, y, w, h, colorKey]) => {
    slide.addShape("rect", {
      x: EMU(x), y: EMU(y), w: EMU(w), h: EMU(h),
      fill: { color: COLORS[colorKey] },
      line: { type: "none" },
    });
  });
}

function contentTitle(slide, text) {
  slide.addText(text, {
    x: EMU(3122676), y: EMU(274320), w: EMU(5943600), h: EMU(777240),
    fontFace: FONT, fontSize: 32, bold: true, color: DARKGRAY,
    align: "center", valign: "middle", margin: 0,
  });
}

function letterColor(letter) {
  const idx = (letter.toUpperCase().charCodeAt(0) - 65) % 6;
  return COLORS[CYCLE[idx]];
}

// ---------- честный contain-fit (БЕЗ pptxgenjs "sizing" — он растягивает картинку до box,
// искажая пропорции; это и было причиной "поплывшей" буквы) ----------
function getImageSize(buf) {
  if (buf.length > 24 && buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length - 8) {
      if (buf[offset] !== 0xff) { offset++; continue; }
      const marker = buf[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      const segLength = buf.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      offset += 2 + segLength;
    }
  }
  return null;
}

function containFit(boxX, boxY, boxW, boxH, filePath) {
  let dims = null;
  try {
    dims = getImageSize(fs.readFileSync(filePath));
  } catch (e) { /* ignore */ }
  if (!dims || !dims.width || !dims.height) return { x: boxX, y: boxY, w: boxW, h: boxH };
  const scale = Math.min(boxW / dims.width, boxH / dims.height);
  const w = dims.width * scale, h = dims.height * scale;
  return { x: boxX + (boxW - w) / 2, y: boxY + (boxH - h) / 2, w, h };
}

// вставка картинки: реальный contain-fit по пикселям + safe fallback на placeholder, если файла нет
function safeImage(slide, filePath, opts, placeholderLabel, promptText) {
  if (filePath && fs.existsSync(filePath)) {
    const fit = containFit(opts.x, opts.y, opts.w, opts.h, filePath);
    slide.addImage({ path: filePath, x: fit.x, y: fit.y, w: fit.w, h: fit.h });
  } else {
    slide.addShape("rect", {
      x: opts.x, y: opts.y, w: opts.w, h: opts.h,
      fill: { color: "EAF3FB" }, line: { color: COLORS.BLUE, width: 2, dashType: "dash" },
    });
    if (promptText) {
      // текст промпта показывается прямо на слайде - скопировать, сгенерировать
      // самому (например через ChatGPT), вставить картинку на это место вручную
      slide.addText(
        [
          { text: "🖼  " + (placeholderLabel || "IMAGE PROMPT") + "\n", options: { bold: true, fontSize: 12, color: COLORS.BLUE, breakLine: true } },
          { text: promptText, options: { fontSize: 10, italic: true, color: "444444" } },
        ],
        {
          x: opts.x + 0.15, y: opts.y + 0.15, w: opts.w - 0.3, h: opts.h - 0.3,
          align: "left", valign: "top", fontFace: FONT, wrap: true,
        }
      );
    } else {
      slide.addText("🖼  " + (placeholderLabel || "MISSING IMAGE"), {
        x: opts.x, y: opts.y, w: opts.w, h: opts.h,
        align: "center", valign: "middle", fontFace: FONT, fontSize: 14, bold: true, color: COLORS.BLUE,
      });
    }
  }
}

// единый рендер сценария игры: прямые реплики выделены цветом+подчёркиванием,
// действия обычным текстом, инструкции жирным чёрным — один стиль на Game 1/2/3
function renderGameScript(slide, script, box) {
  const runs = [];
  (script || []).forEach((line) => {
    let opts = { fontSize: 18, breakLine: true };
    if (line.speaker === "children") {
      opts = { ...opts, color: COLORS.BLUE };
    } else if (line.speaker === "teacher") {
      opts = { ...opts, color: COLORS.RED };
    } else if (line.speaker === "instruction") {
      opts = { ...opts, color: "222222" };
    } else {
      opts = { ...opts, italic: true, color: "555555", fontSize: 16 };
    }
    runs.push({ text: line.text, options: opts });
    runs.push({ text: "", options: { fontSize: 7, breakLine: true } });
  });
  slide.addText(runs, { x: box.x, y: box.y, w: box.w, h: box.h, fontFace: FONT, align: "left", valign: "top" });
}

// алфавит-слайд: общий на все уроки, меняется только подпись снизу (DESIGN_SYSTEM.md)
function alphabetSlide(pres, content) {
  const slide = pres.addSlide();
  slide.background = { color: "F3EEE2" };
  const rows = [
    { letters: "ABCDEFGHI", y: 457200 },
    { letters: "JKLMNOPQR", y: 2423160 },
    { letters: "STUVWXYZ", y: 4389120 },
  ];
  rows.forEach((row) => {
    const chars = row.letters.split("");
    const runs = chars.map((ch, i) => ({
      text: ch + (i < chars.length - 1 ? " " : ""),
      options: { color: letterColor(ch), fontFace: "Comic Sans MS", fontSize: 68, bold: true },
    }));
    slide.addText(runs, {
      x: EMU(182880), y: EMU(row.y), w: EMU(11795760), h: EMU(1828800),
      align: "center", valign: "middle", margin: 0, wrap: false,
    });
  });
  const caption = content.alphabet_caption ||
    `Point to each letter until students guess: ${content.letter.toUpperCase()} is for ${content.topic}!`;
  slide.addText(caption, {
    x: EMU(548640), y: EMU(6263640), w: EMU(11064240), h: EMU(548640),
    fontFace: FONT, fontSize: 14, color: "666666", align: "center",
  });
  return slide;
}

function videoSlide(pres, { title, youtubeId, caption }) {
  const slide = pres.addSlide();
  slide.background = { color: "141414" };
  slide.addShape("roundRect", {
    x: EMU(457200), y: EMU(411480), w: EMU(11247120), h: EMU(5486400),
    fill: { color: "2A2A2A" }, line: { color: "555555", width: 1 }, rectRadius: 0.05,
  });
  if (youtubeId) {
    slide.addMedia({
      type: "online",
      link: `https://www.youtube.com/embed/${youtubeId}`,
      x: EMU(457200), y: EMU(411480), w: EMU(11247120), h: EMU(5486400),
    });
  } else {
    slide.addText("🎬  INSERT VIDEO HERE", {
      x: EMU(457200), y: EMU(411480), w: EMU(11247120), h: EMU(5486400),
      fontFace: FONT, fontSize: 28, bold: true, color: "888888", align: "center", valign: "middle",
    });
  }
  slide.addText(caption || title, {
    x: EMU(457200), y: EMU(411480 + 5486400 + 40000), w: EMU(11247120), h: EMU(300000),
    fontFace: FONT, fontSize: 13, color: "AAAAAA", align: "center",
  });
  if (youtubeId) {
    slide.addText("Link to Youtube", {
      x: 0, y: EMU(6080760), w: EMU(12161520), h: EMU(365760),
      fontFace: FONT, fontSize: 15, color: "6FB6FF", align: "center",
      hyperlink: { url: `https://www.youtube.com/watch?v=${youtubeId}` },
    });
  }
  return slide;
}

function markerSlide(pres, text) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.BLUE };
  addDecor(slide, STYLE_MARKER);
  slide.addText(text, {
    x: 0, y: EMU(2450592), w: EMU(12161520), h: EMU(1947672),
    fontFace: FONT, fontSize: 72, bold: true, color: "FFFFFF",
    align: "center", valign: "middle", margin: 0,
  });
  return slide;
}

// ---------- главная сборка ----------
function build(contentPath) {
  const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  const topicSlug = content.topic.toLowerCase().replace(/\s+/g, "_");
  const genDir = path.join(ASSETS, "generated", topicSlug);
  const propsDir = path.join(ASSETS, "story_props", topicSlug);
  const stepsDir = path.join(ASSETS, "steps", topicSlug);

  const pres = new pptxgen();
  pres.defineLayout({ name: "LEGO", width: 13.333, height: 7.5 });
  pres.layout = "LEGO";

  // 1. COVER
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BLUE };
    addDecor(slide, STYLE_A); // мозаика по краям вместо фото, как в STYLE_COVER
    slide.addText(content.topic, {
      x: 0, y: 0, w: EMU(12161520), h: EMU(6858000),
      fontFace: FONT, fontSize: 72, bold: true, color: "FFFFFF",
      align: "center", valign: "middle", margin: 0,
    });
  }

  // 2. INTRO VIDEO
  videoSlide(pres, {
    title: "Intro Video",
    youtubeId: content.intro_video_youtube_id || null,
    caption: content.intro_video_youtube_id
      ? content.intro_video_caption
      : `Fun movement/dance song for "${content.topic}" - insert video`,
  });

  // 3. STORY
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_A);
    contentTitle(slide, content.topic + " Story");
    safeImage(slide, path.join(genDir, "story_background.png"),
      { x: 0.5, y: 1.3, w: 3.6, h: 2.4 }, "STORY BG THUMBNAIL", content.story.background_image_prompt);
    let y = 1.3;
    slide.addText([{ text: "Short summary: ", options: { bold: true, fontSize: 13 } },
      { text: content.story.short_summary, options: { fontSize: 13, breakLine: true } }],
      { x: 4.5, y, w: 8.1, h: 1.0, fontFace: FONT, color: "222222" });
    y += 1.1;
    slide.addText("Characters:", { x: 4.5, y, w: 8.1, h: 0.3, fontFace: FONT, fontSize: 13, bold: true });
    y += 0.32;
    content.story.characters.forEach((c) => {
      slide.addText(c, { x: 4.5, y, w: 8.1, h: 0.28, fontFace: FONT, fontSize: 12 });
      y += 0.3;
    });
    y += 0.05;
    slide.addText([{ text: "Key phrase: ", options: { bold: true, fontSize: 13 } },
      { text: content.story.key_phrase, options: { fontSize: 13 } }],
      { x: 4.5, y, w: 8.1, h: 0.4, fontFace: FONT });
    y += 0.45;
    slide.addText(content.story.call_and_response_note, {
      x: 4.5, y, w: 8.1, h: 0.6, fontFace: FONT, fontSize: 12, color: "666666",
    });
    slide.addNotes(
      `FULL STORY (speaker notes):\n${content.story.full_story_speaker_notes}\n\nOBSERVATION:\n${content.story.observation_questions.join("\n")}`
    );
  }

  // 4. STORY PROPS
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_A);
    contentTitle(slide, "Story Props");
    const n = content.story_props.length;
    const cols = Math.min(n, 4);
    const cellW = 10.5 / cols;
    content.story_props.forEach((prop, i) => {
      const x = 1.4 + (i % cols) * cellW;
      const y = 2.0 + Math.floor(i / cols) * 3.0;
      const slug = prop.name.toLowerCase().replace(/\s+/g, "_");
      safeImage(slide, path.join(propsDir, `prop_${slug}.png`),
        { x, y, w: cellW - 0.4, h: 2.2 }, prop.name, prop.image_prompt);
      slide.addText(prop.name, {
        x, y: y + 2.25, w: cellW - 0.4, h: 0.35, align: "center", fontFace: FONT, fontSize: 13,
      });
    });
  }

  // 5. MODEL BUILDING (marker)
  markerSlide(pres, "Model Building");

  // 6. REAL OBJECT PHOTO (no title, but keep the corner decor so it doesn't look broken/blank)
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_A);
    safeImage(slide, path.join(genDir, "real_object.png"),
      { x: 3.0, y: 0.8, w: 7.3, h: 5.9 }, "REAL OBJECT PHOTO", content.real_object_image_prompt);
  }

  // 7. OUR GOAL
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_A);
    contentTitle(slide, "Our Goal");
    if (content.our_goal && content.our_goal.split) {
      safeImage(slide, path.join(genDir, "goal_easy.png"), { x: 0.8, y: 1.6, w: 5.5, h: 4.8 }, content.our_goal.easy_note || "EASY VERSION");
      safeImage(slide, path.join(genDir, "goal_hard.png"), { x: 6.9, y: 1.6, w: 5.5, h: 4.8 }, content.our_goal.hard_note || "HARD VERSION");
    } else {
      safeImage(slide, path.join(genDir, "goal.png"), { x: 3.5, y: 1.6, w: 6.3, h: 4.8 }, "GOAL MODEL PHOTO");
    }
  }

  // 8. STEP BY STEP
  if (content.step_by_step_placeholder !== false && (!fs.existsSync(stepsDir) || fs.readdirSync(stepsDir).length === 0)) {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_A);
    contentTitle(slide, "Step by Step");
    slide.addText("BUILD STEPS PLACEHOLDER", {
      x: 1.5, y: 2.8, w: 10.3, h: 1.5, align: "center", valign: "middle",
      fontFace: FONT, fontSize: 28, color: "999999", fill: { color: "F5F5F5" },
    });
  } else {
    const files = fs.readdirSync(stepsDir).sort();
    files.forEach((f, i) => {
      const slide = pres.addSlide();
      addDecor(slide, STYLE_A);
      contentTitle(slide, `Step ${i + 1}`);
      safeImage(slide, path.join(stepsDir, f), { x: 3.2, y: 1.5, w: 6.9, h: 5.2 }, `Step ${i + 1}`);
    });
  }

  // 9. PRESENTATION
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_CLEANUP);
    slide.addText("Presentation", {
      x: EMU(6400800), y: EMU(448056), w: EMU(5120640), h: EMU(1362456),
      fontFace: FONT, fontSize: 54, color: DARKGRAY, align: "left", valign: "middle", margin: 0,
    });
    const runs = [];
    content.presentation_qa.forEach((qa, i) => {
      runs.push({ text: qa.q, options: { bold: true, fontSize: 20, breakLine: true } });
      runs.push({ text: qa.a, options: { fontSize: 20, breakLine: true } });
      if (i < content.presentation_qa.length - 1) runs.push({ text: "", options: { fontSize: 8, breakLine: true } });
    });
    slide.addText(runs, { x: EMU(6400800), y: EMU(2103120), w: EMU(5120640), h: EMU(4206240), fontFace: FONT, color: "222222" });
  }

  // 10. GAME 1
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_B);
    contentTitle(slide, content.game1.title);
    renderGameScript(slide, content.game1.script, { x: 1.3, y: 1.85, w: 10.7, h: 4.9 });
  }

  // 11. GAME 2 — визуальная часть зависит от content.game2.type, текстовая часть всегда одинакова
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_B);
    contentTitle(slide, content.game2.title);
    renderGameScript(slide, content.game2.script, { x: 0.8, y: 1.85, w: 5.3, h: 4.9 });

    const type = content.game2.type || (content.game2.colors ? "color_matching" : "generic");
    const panelX = 6.5, panelW = 5.3;

    if (type === "color_matching" && content.game2.colors && content.game2.colors.length) {
      const cols = Math.min(content.game2.colors.length, 4);
      const rows = Math.ceil(content.game2.colors.length / cols);
      const cellW = panelW / cols;
      const cellH = 4.6 / rows;
      content.game2.colors.forEach((c, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const x = panelX + col * cellW, y = 1.9 + row * cellH;
        const w = cellW - 0.15, h = cellH - 0.15;
        const imgPath = path.join(genDir, `game2_${c.toLowerCase()}.png`);
        if (fs.existsSync(imgPath)) {
          safeImage(slide, imgPath, { x, y, w, h }, c);
        } else {
          // пока не перекрашено (recolor-game2.py) - просто цветной прямоугольник с подписью,
          // без лишнего текста-инструкции - мы и так точно знаем, какой это цвет
          const hex = resolveColorHex(c);
          slide.addShape("roundRect", {
            x, y, w, h, fill: { color: hex }, line: { color: "FFFFFF", width: 2 }, rectRadius: 0.08,
          });
          slide.addText(c, {
            x, y, w, h, align: "center", valign: "middle",
            fontFace: FONT, fontSize: 14, bold: true, color: isLightColor(hex) ? "222222" : "FFFFFF",
          });
        }
      });
    } else if (type === "shape_build") {
      safeImage(slide, path.join(genDir, "game2_shape_reference.png"), { x: panelX, y: 1.9, w: panelW, h: 2.2 }, "REFERENCE SHAPE", content.game2.shape_reference_prompt);
      safeImage(slide, path.join(genDir, "game2_shape_pieces.png"), { x: panelX, y: 4.3, w: panelW, h: 2.2 }, "SHAPE PIECES (max 5-6)", content.game2.shape_pieces_prompt);
    } else {
      safeImage(slide, path.join(genDir, "game2_printout.png"), { x: panelX, y: 1.9, w: panelW, h: 4.6 }, "GAME 2 PRINTOUT", content.game2.printout_prompt);
    }
  }

  // 12. ABC SONG VIDEO
  videoSlide(pres, { title: "Alphabet Song", youtubeId: CONST_VIDEOS.alphabet.id, caption: CONST_VIDEOS.alphabet.caption });

  // 13. WHICH LETTER? — это и есть алфавит-слайд (общий на все уроки), учитель водит по буквам
  alphabetSlide(pres, content);

  // 14. LETTER-SPECIFIC VIDEO
  {
    const vid = LETTER_VIDEOS[content.letter.toUpperCase()];
    videoSlide(pres, {
      title: `Letter ${content.letter} Phonics`,
      youtubeId: vid,
      caption: vid ? `Letter ${content.letter} Phonics - Little Fox` : `MISSING: add id for letter ${content.letter} to scripts/letter-videos.json`,
    });
  }

  // 15. WHAT LETTER IS IT?
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_A);
    slide.addText("What letter is it?", {
      x: EMU(548640), y: EMU(320040), w: EMU(11064240), h: EMU(822960),
      fontFace: FONT, fontSize: 40, color: "000000", align: "center", valign: "middle", margin: 0,
    });
    slide.addText(content.letter.toUpperCase(), {
      x: 0, y: EMU(1440180), w: EMU(12161520), h: EMU(3657600),
      fontFace: FONT, fontSize: 250, bold: true, color: letterColor(content.letter),
      align: "center", valign: "middle", margin: 0,
    });
    slide.addText("Have students drill the letter and sound chorally and individually.", {
      x: EMU(1371600), y: EMU(5394960), w: EMU(9418320), h: EMU(731520),
      fontFace: FONT, fontSize: 16, color: "000000", align: "center",
    });
    slide.addNotes(
      "Teacher script:\n" + content.letter_slide_script_notes.map((s, i) => `${i + 1}. ${s}`).join("\n")
    );
  }

  // 16. PATTERN SHEET
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_A);
    contentTitle(slide, "Pattern Sheet");
    slide.addText(
      [
        { text: "Pass out bricks and pattern sheet", options: { breakLine: true } },
        { text: "Let's place the bricks on the pattern sheet.", options: { breakLine: true } },
        { text: "Challenge students to build the letter on the baseplate", options: { breakLine: true } },
        { text: "Reward: one toy dollar!", options: {} },
      ],
      { x: 0.6, y: 2.2, w: 4.3, h: 3.5, fontFace: FONT, fontSize: 18, color: "222222" }
    );
    // box подобран под aspect ratio самой буквы (~0.755), чтобы не оставалось пустого поля
    const patternPath = path.join(ASSETS, "letters", `${content.letter.toUpperCase()}_pattern.png`);
    safeImage(slide, patternPath, { x: 7.3, y: 1.2, w: 4.3, h: 5.7 }, "PATTERN");
  }

  // 17. GAME 3
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_B);
    contentTitle(slide, content.game3.title);
    renderGameScript(slide, content.game3.script, { x: 1.3, y: 1.85, w: 10.7, h: 4.9 });
  }

  // 18. CHALLENGE + FREE PLAY
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_B);
    contentTitle(slide, "Challenge or Free Play");
    slide.addText(content.challenge.text, {
      x: EMU(914400), y: EMU(1417320), w: EMU(10332720), h: EMU(1188720),
      fontFace: FONT, fontSize: 18, bold: true, color: COLORS.RED, align: "center", valign: "middle",
    });
    safeImage(slide, path.join(genDir, "challenge.png"), { x: 1.2, y: 3.0, w: 5.0, h: 3.6 }, "CHALLENGE IMAGE", content.challenge.challenge_image_prompt);
    safeImage(slide, path.join(ASSETS, "free_play.png"), { x: 7.2, y: 3.0, w: 5.0, h: 3.6 }, "FREE PLAY");
  }

  // 19. MODEL BUILDING (repeat, marker)
  markerSlide(pres, "Model Building");

  // 20. CLEAN UP
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_CLEANUP);
    slide.addText("Clean Up", {
      x: EMU(5577840), y: EMU(2481760), w: EMU(6309360), h: EMU(1437280),
      fontFace: FONT, fontSize: 72, color: DARKGRAY, align: "left", valign: "middle", margin: 0,
    });
    slide.addText("Everyone who helps clean up earns one toy dollar!", {
      x: EMU(5577840), y: EMU(3749040), w: EMU(6309360), h: EMU(600000),
      fontFace: FONT, fontSize: 18, color: "000000",
    });
  }

  // 21. WRAP UP
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.RED };
    addDecor(slide, STYLE_WRAPUP);
    slide.addText("Wrap up", {
      x: 0, y: 0, w: EMU(12161520), h: EMU(6858000),
      fontFace: FONT, fontSize: 72, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0,
    });
  }

  // 22. LETTER AGAIN
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_A);
    contentTitle(slide, `Letter ${content.letter.toUpperCase()} Again!`);
    slide.addText(content.letter.toUpperCase(), {
      x: 0, y: EMU(2125980), w: EMU(12161520), h: EMU(3657600),
      fontFace: FONT, fontSize: 250, bold: true, color: letterColor(content.letter),
      align: "center", valign: "middle", margin: 0,
    });
  }

  // 23. WHAT IS THIS? (same real photo, no title, but keep the corner decor)
  {
    const slide = pres.addSlide();
    addDecor(slide, STYLE_A);
    safeImage(slide, path.join(genDir, "real_object.png"),
      { x: 3.0, y: 0.8, w: 7.3, h: 5.9 }, "REAL OBJECT PHOTO (same as slide 6)", content.real_object_image_prompt);
  }

  // 24. CLOSING VIDEO
  videoSlide(pres, { title: "Closing", youtubeId: null, caption: "Closing song (fingers and toes, etc.) - insert video" });

  const outDir = path.join(ROOT, "output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${topicSlug}.pptx`);
  return pres.writeFile({ fileName: outPath }).then(() => {
    console.log("Written:", outPath);
    return outPath;
  });
}

const contentArg = process.argv[2];
if (!contentArg) {
  console.error("Usage: node scripts/build-pptx.js content/<topic>.json");
  process.exit(1);
}
build(path.resolve(contentArg)).catch((e) => {
  console.error(e);
  process.exit(1);
});
