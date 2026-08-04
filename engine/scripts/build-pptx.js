// build-pptx.js
// Usage: node scripts/build-pptx.js <absolute path to content.json>
// Builds <BRICK_DATA_DIR>/output/<topic_slug>.pptx following DESIGN_SYSTEM.md.
//
// Static, read-only assets (letters, free_play.png) are read from the app's
// own install folder (__dirname-based ROOT). Everything generated per-lesson
// (content.json, assets/generated/<slug>, output) lives in BRICK_DATA_DIR —
// a writable folder outside the install directory (Windows blocks writing
// into an installed app's own folder without admin rights).

const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = process.env.BRICK_DATA_DIR || ROOT;

const COLORS = {
  RED: "D03331", BLUE: "3095D4", GREEN: "6FC141",
  PURPLE: "A441C2", YELLOW: "FCD900", TEAL: "0097A7",
  TITLE_GRAY: "404040", VIDEO_BG: "141414", ALPHABET_BG: "F3EEE2"
};
const ALPHABET_CYCLE = [COLORS.RED, COLORS.BLUE, COLORS.GREEN, COLORS.PURPLE, COLORS.YELLOW, COLORS.TEAL];
const SPEAKER_STYLE = {
  children: { color: "2E6DA4", italic: false, bold: true },
  teacher: { color: "333333", italic: false, bold: false },
  action: { color: "666666", italic: true, bold: false },
  instruction: { color: "333333", italic: false, bold: false }
};

const EMU_PER_INCH = 914400;
const inch = (emu) => emu / EMU_PER_INCH;
const box = (x, y, w, h) => ({ x: inch(x), y: inch(y), w: inch(w), h: inch(h) });
const boxIn = (x, y, w, h) => ({ x, y, w, h });

function imgSize(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) { offset++; continue; }
    const marker = buf[offset + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      return { h: buf.readUInt16BE(offset + 5), w: buf.readUInt16BE(offset + 7) };
    }
    const len = buf.readUInt16BE(offset + 2);
    offset += 2 + len;
  }
  return { w: 1, h: 1 };
}

function containFit(filePath, boxX, boxY, boxW, boxH) {
  const { w: iw, h: ih } = imgSize(filePath);
  const scale = Math.min(boxW / iw, boxH / ih);
  const drawW = iw * scale, drawH = ih * scale;
  return { x: boxX + (boxW - drawW) / 2, y: boxY + (boxH - drawH) / 2, w: drawW, h: drawH };
}

const STYLE_A = [
  [11431829, 4573829, 760781, 1516990, "PURPLE"], [11431829, 0, 760781, 760781, "RED"],
  [10686593, 0, 760781, 760781, "RED"], [9932213, 0, 760781, 760781, "YELLOW"],
  [9177833, 0, 760781, 760781, "YELLOW"], [0, 5334610, 760781, 760781, "YELLOW"],
  [1829, 0, 760781, 760781, "BLUE"], [755294, 0, 760781, 760781, "BLUE"],
  [1829, 6090818, 760781, 760781, "GREEN"], [755294, 6090818, 760781, 760781, "GREEN"],
  [1506017, 6090818, 760781, 760781, "GREEN"], [11431829, 6090818, 760781, 760781, "BLUE"]
];
const STYLE_B = [
  [11430914, 0, 760781, 760781, "BLUE"], [11431829, 747979, 760781, 760781, "PURPLE"],
  [11430914, 1508760, 760781, 760781, "YELLOW"], [0, 6101791, 3004718, 760781, "RED"],
  [0, 5341010, 760781, 760781, "BLUE"], [11431829, 6090818, 760781, 760781, "GREEN"],
  [10699394, 6090818, 760781, 760781, "GREEN"], [0, 0, 760781, 760781, "PURPLE"]
];
const STYLE_MARKER = [
  [0, -1829, 760781, 760781, "BLUE"], [747979, -1829, 2282342, 760781, "GREEN"],
  [0, 2304288, 760781, 760781, "GREEN"], [757123, 5339182, 760781, 1517904, "PURPLE"],
  [0, 758952, 1530706, 760781, "PURPLE"], [0, 3821278, 760781, 760781, "RED"],
  [0, 3065069, 1530706, 760781, "YELLOW"], [1517904, 6099962, 2277770, 758952, "YELLOW"],
  [0, 4582058, 760781, 2275942, "BLUE"]
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
  [0, 6090818, 760781, 760781, "YELLOW"], [2253996, 6090818, 760781, 760781, "GREEN"]
];

function addSquares(slide, set) {
  set.forEach(([x, y, w, h, colorKey]) => {
    slide.addShape("rect", { ...box(x, y, w, h), fill: { color: COLORS[colorKey] }, line: { type: "none" } });
  });
}
function addContentTitle(slide, text) {
  slide.addText(text, {
    ...box(3122676, 274320, 5943600, 777240),
    fontFace: "Arial", fontSize: 32, bold: true, color: COLORS.TITLE_GRAY, align: "center", valign: "middle"
  });
}

function buildCover(pres, content) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.BLUE };
  addSquares(slide, STYLE_A);
  const titleText = content.topic.charAt(0).toUpperCase() + content.topic.slice(1).toLowerCase();
  slide.addText(titleText, {
    ...box(0, 0, 12161520, 6858000),
    fontFace: "Arial", fontSize: 60, bold: true, color: "FFFFFF", align: "center", valign: "middle"
  });
}

function buildMarker(pres, label) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.BLUE };
  addSquares(slide, STYLE_MARKER);
  slide.addText(label, {
    ...box(0, 2450592, 12161520, 1947672),
    fontFace: "Arial", fontSize: 66, bold: true, color: "FFFFFF", align: "center", valign: "middle"
  });
}

function buildVideoSlide(pres, title, youtubeId, caption) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.VIDEO_BG };
  addContentTitle(slide, title);
  if (youtubeId && youtubeId !== "SEARCH_NEEDED" && youtubeId.trim()) {
    slide.addMedia({ type: "online", link: `https://www.youtube.com/embed/${youtubeId}`, ...box(457200, 411480, 11247120, 5486400) });
    slide.addText("Link to Youtube", {
      hyperlink: { url: `https://www.youtube.com/watch?v=${youtubeId}` },
      ...box(0, 6080760, 12161520, 365760), fontFace: "Arial", fontSize: 15, color: "6FB6FF", align: "center"
    });
  } else {
    slide.addText(`[NEEDS REAL YOUTUBE ID: ${caption || ""}]`, {
      ...box(457200, 411480, 11247120, 5486400), fontFace: "Arial", fontSize: 20, color: "888888", align: "center", valign: "middle"
    });
  }
  slide.addText(caption || "", {
    ...box(457200, 5950000, 11247120, 300000), fontFace: "Arial", fontSize: 13, color: "AAAAAA", align: "center"
  });
}

function estimateTextHeightEMU(text, fontSize, widthEMU, extraLines) {
  // Rough estimate: Arial averages about 0.5*fontSize points per character.
  const widthPt = widthEMU / 12700;
  const charsPerLine = Math.max(10, Math.floor(widthPt / (fontSize * 0.5)));
  const lineCount = Math.max(1, Math.ceil((text || "").length / charsPerLine)) + (extraLines || 0);
  const lineHeightPt = fontSize * 1.25;
  return Math.round(lineCount * lineHeightPt * 12700);
}

function buildStory(pres, content, assetsDir) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_A);
  addContentTitle(slide, content.topic);

  const bgImg = path.join(assetsDir, "story_background.png");
  const imgBox = { x: 548640, y: 1150000, w: 4700000, h: 4900000 };
  if (fs.existsSync(bgImg)) {
    slide.addImage({ path: bgImg, ...containFit(bgImg, inch(imgBox.x), inch(imgBox.y), inch(imgBox.w), inch(imgBox.h)) });
  } else {
    slide.addShape("rect", { ...box(imgBox.x, imgBox.y, imgBox.w, imgBox.h), fill: { color: "F0F0F0" }, line: { color: "DDDDDD" } });
  }

  const textX = 5650000;
  const textW = 5950000;
  let y = 1150000;
  const summaryText = "Short summary: " + content.story.short_summary;
  slide.addText([{ text: "Short summary: ", options: { bold: true, fontSize: 15 } }, { text: content.story.short_summary, options: { fontSize: 15 } }],
    { ...box(textX, y, textW, estimateTextHeightEMU(summaryText, 15, textW, 0)), fontFace: "Arial", color: "333333", valign: "top" });
  y += estimateTextHeightEMU(summaryText, 15, textW, 0) + 220000;

  slide.addText([{ text: "Characters: ", options: { bold: true, fontSize: 15 } }],
    { ...box(textX, y, textW, 320000), fontFace: "Arial", color: "333333" });
  y += 340000;
  const charactersText = content.story.characters.join("\n");
  slide.addText(charactersText, { ...box(textX, y, textW, estimateTextHeightEMU(charactersText, 13, textW, content.story.characters.length - 1)), fontFace: "Arial", fontSize: 13, color: "333333" });
  y += estimateTextHeightEMU(charactersText, 13, textW, content.story.characters.length - 1) + 220000;

  const phraseText = "Key phrase: " + content.story.key_phrase;
  slide.addText([{ text: "Key phrase: ", options: { bold: true, fontSize: 15 } }, { text: content.story.key_phrase, options: { fontSize: 15 } }],
    { ...box(textX, y, textW, estimateTextHeightEMU(phraseText, 15, textW, 0)), fontFace: "Arial", color: "333333" });
  y += estimateTextHeightEMU(phraseText, 15, textW, 0) + 220000;

  slide.addText(content.story.call_and_response_note || "", { ...box(textX, y, textW, 700000), fontFace: "Arial", fontSize: 13, color: "666666", italic: true });

  slide.addNotes(`FULL STORY:\n${content.story.full_story_speaker_notes}\n\nOBSERVATION:\n${(content.story.observation_questions || []).join("\n")}`);
}

function buildStoryProps(pres, content, assetsDir) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_A);
  addContentTitle(slide, "Story Props");
  const props = content.story_props || [];
  const cols = Math.min(props.length, 4) || 1;
  const cellW = 10161520 / cols;
  props.forEach((prop, i) => {
    const x = 1000000 + i * cellW;
    const imgPath = path.join(assetsDir, `${prop.name.toLowerCase().replace(/\s+/g, "_")}.png`);
    if (fs.existsSync(imgPath)) {
      slide.addImage({ path: imgPath, ...containFit(imgPath, inch(x), inch(1600000), inch(cellW - 200000), inch(3200000)) });
    }
    slide.addText(prop.name, { ...box(x, 5000000, cellW - 200000, 400000), fontFace: "Arial", fontSize: 16, align: "center" });
  });
}

function buildRealObjectSlide(pres, assetsDir) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_A);
  const imgPath = path.join(assetsDir, "real_object.png");
  if (fs.existsSync(imgPath)) {
    slide.addImage({ path: imgPath, ...containFit(imgPath, inch(2000000), inch(700000), inch(8161520), inch(5400000)) });
  }
}

function buildOurGoal(pres, content, assetsDir) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_A);
  addContentTitle(slide, "Our Goal");
  const easyImg = path.join(assetsDir, "our_goal_easy.png");
  const hardImg = path.join(assetsDir, "our_goal_hard.png");
  if (fs.existsSync(easyImg)) slide.addImage({ path: easyImg, ...containFit(easyImg, inch(600000), inch(1400000), inch(5300000), inch(4800000)) });
  else slide.addText(content.our_goal?.easy_note || "", { ...box(600000, 1400000, 5300000, 4800000), align: "center", valign: "middle", fontSize: 14, color: "999999" });
  if (fs.existsSync(hardImg)) slide.addImage({ path: hardImg, ...containFit(hardImg, inch(6300000), inch(1400000), inch(5300000), inch(4800000)) });
  else slide.addText(content.our_goal?.hard_note || "", { ...box(6300000, 1400000, 5300000, 4800000), align: "center", valign: "middle", fontSize: 14, color: "999999" });
}

function buildStepPlaceholder(pres) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_A);
  slide.addText("BUILD STEPS PLACEHOLDER\n(add real step-by-step photos here, one photo per slide)", {
    ...box(1000000, 2500000, 10161520, 1800000), fontFace: "Arial", fontSize: 24, color: "999999", align: "center", valign: "middle"
  });
}

function buildAlphabetSlide(pres, content) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.ALPHABET_BG };
  const rows = [{ letters: "ABCDEFGHI", y: 457200 }, { letters: "JKLMNOPQR", y: 2423160 }, { letters: "STUVWXYZ", y: 4389120 }];
  rows.forEach(({ letters, y }) => {
    const runs = letters.split("").map((ch) => ({ text: ch + " ", options: { color: ALPHABET_CYCLE[(ch.charCodeAt(0) - 65) % 6] } }));
    slide.addText(runs, { ...box(182880, y, 11795760, 1828800), fontFace: "Comic Sans MS", fontSize: 80, bold: true, align: "center", valign: "middle" });
  });
  const caption = content.alphabet_caption || `Point to each letter until students guess: ${content.letter} is for ${content.topic}!`;
  slide.addText(caption, { ...box(548640, 6263640, 11064240, 548640), fontFace: "Arial", fontSize: 14, color: "666666", align: "center" });
}

function buildWhatLetter(pres, letter, isRepeat) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_A);
  const color = ALPHABET_CYCLE[(letter.charCodeAt(0) - 65) % 6];
  if (!isRepeat) {
    slide.addText("What letter is it?", { ...box(548640, 320040, 11064240, 822960), fontFace: "Arial", fontSize: 40, color: "000000", align: "center" });
    slide.addText(letter, { ...box(0, 1440180, 12161520, 3657600), fontFace: "Arial", fontSize: 250, bold: true, color, align: "center", valign: "middle" });
    slide.addText("Have students drill the letter and sound chorally and individually", {
      ...box(1371600, 5394960, 9418320, 731520), fontFace: "Arial", fontSize: 16, color: "000000", align: "center"
    });
  } else {
    addContentTitle(slide, `Letter ${letter} Again!`);
    slide.addText(letter, { ...box(0, 2125980, 12161520, 3657600), fontFace: "Arial", fontSize: 250, bold: true, color, align: "center", valign: "middle" });
  }
}

function buildPatternSheet(pres, letter) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_A);
  addContentTitle(slide, "Pattern Sheet");
  slide.addText(
    "Pass out bricks and pattern sheet\nLet's place the bricks on the pattern sheet.\nChallenge students to build the letter on the baseplate\nReward: one toy dollar!",
    { x: 0.6, y: 2.2, w: 4.3, h: 3.5, fontFace: "Arial", fontSize: 18, color: "000000" }
  );
  // Letters are static/read-only assets, packaged with the app -> always from ROOT.
  const letterImg = path.join(ROOT, "assets", "letters", `${letter}_pattern.png`);
  if (fs.existsSync(letterImg)) {
    slide.addImage({ path: letterImg, ...containFit(letterImg, 7.3, 1.2, 4.3, 5.7) });
  }
}

function estimateWrappedLineCount(text, fontSize, widthEMU) {
  const widthPt = widthEMU / 12700;
  // 0.56 instead of 0.5 - bold children lines are noticeably wider per
  // character than the estimate assumed, which was under-counting wraps
  // and letting text spill past the box into the decorative squares.
  const charsPerLine = Math.max(10, Math.floor(widthPt / (fontSize * 0.56)));
  return Math.max(1, Math.ceil((text || "").length / charsPerLine));
}

function addChantHeader(slide, script, boxSpec) {
  // Pulls out the children's repeated chant and displays it BIG and centered -
  // this is the phrase kids are learning to read/say themselves, so it needs
  // to stand out clearly from everything else on the slide (which is for the
  // teacher). Returns the y (in inches) where the rest of the script should
  // start, so it never overlaps this header.
  const chantLine = (script || []).find((l) => l.speaker === "children");
  if (!chantLine) return boxSpec.y;

  const chantFontSize = chantLine.text.length > 40 ? 28 : 36;
  slide.addText(chantLine.text, {
    x: boxSpec.x, y: boxSpec.y, w: boxSpec.w, h: 1.05,
    fontFace: "Arial", fontSize: chantFontSize, bold: true, color: SPEAKER_STYLE.children.color,
    align: "center", valign: "middle", autoFit: true
  });
  slide.addText("Learn the phrase above together first - children repeat it during the game below!", {
    x: boxSpec.x, y: boxSpec.y + 1.05, w: boxSpec.w, h: 0.32,
    fontFace: "Arial", fontSize: 11, italic: true, color: "888888", align: "center", valign: "top"
  });
  // Extra breathing room (0.2in) below the subtitle box before the script
  // starts - previously only 0.05in of actual gap, which looked like the
  // instruction line and the first script line were touching/overlapping.
  return boxSpec.y + 1.05 + 0.32 + 0.2;
}

function addScript(slide, script, boxSpec) {
  const lines = script || [];
  const boxHeightPt = boxSpec.h * 72;
  const boxWidthEMU = boxSpec.w * 914400;

  // Find the largest font size (from a shrinking ladder) whose estimated
  // total wrapped height actually fits the box - guarantees no overflow
  // into the decorative squares below, instead of guessing from line count alone.
  const sizesToTry = [20, 18, 16, 14, 13, 12, 11];
  let fontSize = sizesToTry[sizesToTry.length - 1];
  const SAFETY_BUFFER = 1.32; // err toward shrinking rather than risking overflow into the decorative squares
  for (const size of sizesToTry) {
    const spacerPt = Math.max(4, Math.round(size * 0.3));
    let totalPt = 0;
    lines.forEach((line, i) => {
      const wrapped = estimateWrappedLineCount(line.text, size, boxWidthEMU);
      totalPt += wrapped * size * 1.25;
      if (i < lines.length - 1) totalPt += spacerPt;
    });
    totalPt *= SAFETY_BUFFER;
    if (totalPt <= boxHeightPt) {
      fontSize = size;
      break;
    }
    fontSize = size; // if nothing fits, fall through to the smallest size tried
  }

  const spacerSize = Math.max(4, Math.round(fontSize * 0.3));
  const runs = [];
  lines.forEach((line, i) => {
    const style = SPEAKER_STYLE[line.speaker] || SPEAKER_STYLE.instruction;
    runs.push({ text: line.text, options: { color: style.color, italic: style.italic, bold: !!style.bold, fontSize, breakLine: true, align: "center" } });
    if (i < lines.length - 1) {
      runs.push({ text: "", options: { breakLine: true, fontSize: spacerSize } });
    }
  });
  slide.addText(runs, { ...boxSpec, fontFace: "Arial", align: "center", valign: "middle", autoFit: true });
}

function buildGame1(pres, content) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_B);
  addContentTitle(slide, content.game1.title);
  const scriptY = addChantHeader(slide, content.game1.script, boxIn(1.3, 1.5, 10.7, 1.4));
  addScript(slide, content.game1.script, boxIn(1.3, scriptY, 10.7, 6.0 - scriptY));
}

function buildGame2(pres, content, assetsDir) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_B);
  addContentTitle(slide, content.game2.title);
  const colors = content.game2.colors || [];
  const hasVisual = colors.length > 0 || fs.existsSync(path.join(assetsDir, "game2_printout.png"));

  if (hasVisual) {
    const scriptY = addChantHeader(slide, content.game2.script, boxIn(0.8, 1.5, 5.6, 1.4));
    addScript(slide, content.game2.script, boxIn(0.8, scriptY, 5.6, 6.0 - scriptY));
    if (colors.length) {
      const cols = 3;
      colors.forEach((color, i) => {
        const cx = 6.7 + (i % cols) * 1.7;
        const cy = 1.85 + Math.floor(i / cols) * 1.7;
        const imgPath = path.join(assetsDir, `game2_${color.toLowerCase()}.png`);
        if (fs.existsSync(imgPath)) slide.addImage({ path: imgPath, ...containFit(imgPath, cx, cy, 1.5, 1.5) });
      });
    } else {
      const printoutImg = path.join(assetsDir, "game2_printout.png");
      slide.addImage({ path: printoutImg, ...containFit(printoutImg, 6.7, 1.85, 5.6, 4.9) });
    }
  } else {
    // Sensory / no-visual games: let the text use the full slide width, like Game 1 and 3.
    const scriptY = addChantHeader(slide, content.game2.script, boxIn(1.3, 1.5, 10.7, 1.4));
    addScript(slide, content.game2.script, boxIn(1.3, scriptY, 10.7, 6.0 - scriptY));
  }
}

function buildGame3(pres, content) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_B);
  addContentTitle(slide, content.game3.title);
  const scriptY = addChantHeader(slide, content.game3.script, boxIn(1.3, 1.5, 10.7, 1.4));
  addScript(slide, content.game3.script, boxIn(1.3, scriptY, 10.7, 6.0 - scriptY));
}

function buildChallenge(pres, content, assetsDir) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_B);
  addContentTitle(slide, "Challenge + Free Play");
  slide.addText(content.challenge.text, {
    ...box(914400, 1200000, 10332720, 1000000), fontFace: "Arial", fontSize: 18, color: "666666", align: "center", valign: "middle"
  });
  const challengeImg = path.join(assetsDir, "challenge.png");
  if (fs.existsSync(challengeImg)) {
    slide.addImage({ path: challengeImg, ...containFit(challengeImg, inch(3400000), inch(2400000), inch(5400000), inch(4000000)) });
  }
}

function buildPresentation(pres, content) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_CLEANUP);
  slide.addText("Presentation", { ...box(6400800, 448056, 5120640, 1362456), fontFace: "Arial", fontSize: 54, color: COLORS.TITLE_GRAY, align: "left", valign: "middle" });
  const runs = [];
  (content.presentation_qa || []).forEach(({ q, a }) => {
    runs.push({ text: q, options: { bold: true, fontSize: 20, breakLine: true } });
    runs.push({ text: a, options: { fontSize: 20, breakLine: true } });
    runs.push({ text: "", options: { fontSize: 8, breakLine: true } });
  });
  slide.addText(runs, { ...box(6400800, 2103120, 5120640, 4206240), fontFace: "Arial", color: "333333" });
}

function buildCleanUp(pres) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_CLEANUP);
  slide.addText("Clean Up", { ...box(5577840, 2651760, 6309360, 1097280), fontFace: "Arial", fontSize: 48, color: COLORS.TITLE_GRAY, align: "left", valign: "middle" });
  slide.addText("Everyone who helps clean up earns one toy dollar!", { ...box(5577840, 3800000, 6309360, 600000), fontFace: "Arial", fontSize: 18, color: "000000" });
}

function buildWrapUp(pres) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.RED };
  slide.addText("Wrap up", { ...box(0, 2450592, 12161520, 1947672), fontFace: "Arial", fontSize: 66, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
}

function loadLetterVideoId(letter) {
  try {
    const raw = fs.readFileSync(path.join(ROOT, "scripts", "letter-videos.json"), "utf-8");
    const map = JSON.parse(raw);
    return map[letter.toUpperCase()] || "";
  } catch {
    return "";
  }
}

function pickIntroVideoId(contentValue) {
  if (contentValue && contentValue !== "SEARCH_NEEDED") return contentValue;
  try {
    const raw = fs.readFileSync(path.join(ROOT, "scripts", "intro-videos.json"), "utf-8");
    const list = JSON.parse(raw).videos || [];
    if (!list.length) return "";
    return list[Math.floor(Math.random() * list.length)].id;
  } catch {
    return "";
  }
}

function buildWhatIsThis(pres, assetsDir) {
  const slide = pres.addSlide();
  addSquares(slide, STYLE_A);
  addContentTitle(slide, "What's this?");
  const imgPath = path.join(assetsDir, "real_object.png");
  if (fs.existsSync(imgPath)) {
    slide.addImage({ path: imgPath, ...containFit(imgPath, inch(2000000), inch(1200000), inch(8161520), inch(4900000)) });
  }
}

function slugify(topic) { return topic.toLowerCase().trim().replace(/\s+/g, "_"); }

async function buildPresentationFile(contentPath) {
  if (!fs.existsSync(contentPath)) throw new Error(`content.json not found at ${contentPath}`);
  const content = JSON.parse(fs.readFileSync(contentPath, "utf-8"));
  const slug = slugify(content.topic);
  const assetsDir = path.join(DATA_DIR, "assets", "generated", slug);

  const pres = new pptxgen();
  pres.defineLayout({ name: "LEGO_LAYOUT", width: 13.33, height: 7.5 });
  pres.layout = "LEGO_LAYOUT";

  buildCover(pres, content);
  const introVideoId = pickIntroVideoId(content.intro_video_youtube_id);
  buildVideoSlide(pres, "Let's Get Moving!", introVideoId, content.intro_video_caption || "Let's get moving!");
  buildStory(pres, content, assetsDir);
  buildStoryProps(pres, content, assetsDir);
  buildMarker(pres, "Model Building");
  buildRealObjectSlide(pres, assetsDir);
  buildOurGoal(pres, content, path.join(DATA_DIR, "assets", "our_goal", slug));
  buildStepPlaceholder(pres);
  buildPresentation(pres, content);
  buildGame1(pres, content);
  buildGame2(pres, content, assetsDir);
  buildVideoSlide(pres, "Alphabet Song", "ezmsrB59mj8", "Sing along with the alphabet!");
  buildAlphabetSlide(pres, content);
  buildVideoSlide(pres, `Letter ${content.letter} Song`, loadLetterVideoId(content.letter), `Letter ${content.letter}`);
  buildWhatLetter(pres, content.letter, false);
  buildPatternSheet(pres, content.letter);
  buildGame3(pres, content);
  buildChallenge(pres, content, assetsDir);
  buildMarker(pres, "Clean Up");
  buildCleanUp(pres);
  buildWrapUp(pres);
  buildWhatLetter(pres, content.letter, true);
  buildWhatIsThis(pres, assetsDir);
  buildVideoSlide(pres, "Let's Move Again!", introVideoId, "One more time - let's relax and have fun!");

  const outDir = path.join(DATA_DIR, "output");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${slug}.pptx`);
  await pres.writeFile({ fileName: outPath });
  console.log(`PPTX written to ${outPath}`);
  return outPath;
}

module.exports = { buildPresentationFile, slugify };

if (require.main === module) {
  const contentPath = process.argv[2];
  if (!contentPath) {
    console.error("Usage: node scripts/build-pptx.js <path to content.json>");
    process.exit(1);
  }
  buildPresentationFile(contentPath).catch((err) => {
    console.error("Failed to build PPTX:", err.message);
    process.exit(1);
  });
}
