#!/usr/bin/env node
/**
 * build-print-pdf.js content/<topic>.json
 *
 * pdf-lib port of the pdfkit version. Ported because pdfkit's dependency
 * `fontkit` pulls in a deep chain of very-new npm packages (get-intrinsic,
 * call-bind-apply-helpers, dunder-proto, get-proto...) that use the newer
 * package.json "exports" resolution - this chain repeatedly failed to
 * resolve inside Electron's bundled Node runtime specifically (works fine
 * under a fresh system Node, fails under Electron's ELECTRON_RUN_AS_NODE),
 * with "Cannot find module" errors 3 separate times across different exact
 * packages in the chain. pdf-lib has ZERO runtime dependencies - this class
 * of bug is now structurally impossible regardless of Node version quirks.
 * We only use the 3 standard PDF fonts (Helvetica/-Bold/-Oblique), which
 * pdf-lib embeds natively without needing fontkit at all (fontkit is only
 * needed by pdf-lib for embedding CUSTOM font files, which we never do).
 *
 * Builds the printable companion PDF following the exact structure from
 * DESIGN_SYSTEM.md (5 pages, Letter format, portrait):
 *   1. Story Props (with captions, the only page with text on the images)
 *   2. Story Background (full-bleed, no captions, auto-rotated if landscape)
 *   3. Full Story Script (for the Teacher) - Short Summary / Materials / Full Story / Observation
 *   4. Game printout (no text)
 *   5. Pattern Sheet (as large as possible, matching the topic's letter)
 * ...plus as many bulk-tile pages as needed for print_items/search_item/
 * class_copies handouts (see pageBulkTiles below).
 *
 * Rule: images are the same files used in the presentation, contain-fit, no
 * custom cropping.
 *
 * NOTE on coordinates: pdf-lib's origin is BOTTOM-LEFT with y increasing
 * upward (same convention the very first reportlab/Python version used).
 * To keep the page-building functions readable top-down (like reading a
 * page), each function tracks its own `cursorY` measured DOWN from the top,
 * and only converts to pdf-lib's bottom-up y at the actual drawText/
 * drawImage call via `toPdfY()`.
 */
const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { PNG } = require("pngjs");

const PAGE_W = 612, PAGE_H = 792; // Letter, portrait - NEVER change orientation
const RED = rgb(0xd0 / 255, 0x33 / 255, 0x31 / 255);
const DARKGRAY = rgb(0x40 / 255, 0x40 / 255, 0x40 / 255);
const GRAY = rgb(0x88 / 255, 0x88 / 255, 0x88 / 255);
const BLACK = rgb(0, 0, 0);

const ROOT = path.dirname(__dirname); // .../engine

// Converts a "distance down from the top of the page" into pdf-lib's
// bottom-up y coordinate for the BASELINE of a line of text/bottom of a box.
function toPdfY(cursorYFromTop) {
  return PAGE_H - cursorYFromTop;
}

function wrapText(text, font, size, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (current && font.widthOfTextAtSize(test, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawCenteredText(page, text, font, size, color, yFromTop, maxWidth = PAGE_W) {
  const w = font.widthOfTextAtSize(text, size);
  const x = (PAGE_W - w) / 2;
  page.drawText(text, { x, y: toPdfY(yFromTop), size, font, color });
  return yFromTop;
}

// Rotates a decoded PNG's raw pixel buffer 90deg. Used instead of relying on
// in-PDF rotation transforms (which need careful anchor-point trig to get
// right without being able to visually test) - rotating the actual pixels
// first means the PDF-side code only ever does simple, easy-to-verify
// non-rotated cover-fit placement.
function rotatePng90(png) {
  const { width: w, height: h, data } = png;
  const out = new PNG({ width: h, height: w });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = (w * y + x) << 2;
      // clockwise 90: new(x', y') = old(y, w-1-x'), i.e. new pixel at
      // (h-1-y, x) in the rotated frame comes from (x, y) in the original.
      const dstX = h - 1 - y;
      const dstY = x;
      const dstIdx = (h * dstY + dstX) << 2;
      out.data[dstIdx] = data[srcIdx];
      out.data[dstIdx + 1] = data[srcIdx + 1];
      out.data[dstIdx + 2] = data[srcIdx + 2];
      out.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return out;
}

async function embedImage(pdfDoc, imgPath) {
  const bytes = fs.readFileSync(imgPath);
  const ext = path.extname(imgPath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return pdfDoc.embedJpg(bytes);
  return pdfDoc.embedPng(bytes);
}

// Draws an image contain-fit (whole image visible, letterboxed) inside a
// box. Box coordinates are given as (boxX, boxYFromTop, boxW, boxH) - top-
// down, matching the rest of this file's coordinate convention.
async function drawImageContain(pdfDoc, page, imgPath, boxX, boxYFromTop, boxW, boxH) {
  if (!fs.existsSync(imgPath)) return;
  const img = await embedImage(pdfDoc, imgPath);
  const scale = Math.min(boxW / img.width, boxH / img.height);
  const w = img.width * scale, h = img.height * scale;
  const x = boxX + (boxW - w) / 2;
  const yFromTop = boxYFromTop + (boxH - h) / 2; // top of the drawn image, top-down
  page.drawImage(img, { x, y: toPdfY(yFromTop + h), width: w, height: h });
}

function pageHeader(page, font, title) {
  drawCenteredText(page, title, font, 20, DARKGRAY, 55, PAGE_W - 80);
  page.drawLine({
    start: { x: 50, y: toPdfY(62) }, end: { x: 562, y: toPdfY(62) },
    thickness: 2, color: RED,
  });
}

async function page1StoryProps(pdfDoc, page, fonts, content, propsDir) {
  pageHeader(page, fonts.bold, "Story Props - Cut Out & Use During Storytelling");
  const props = content.story_props || [];

  // Fixed target sizes by role, not "divide the page evenly" - that produced
  // illogical proportions (a tiny character or a giant carrot). A character
  // prints at roughly a quarter of the page; a handout item (something given
  // to/eaten by kids - a carrot, a leaf, a cactus) prints noticeably smaller
  // but never below a size a 3-4 year old can comfortably hold.
  const CHARACTER_BOX = 300;
  const HANDOUT_BOX = 170;
  const characters = props.filter((p) => (p.role || "character") === "character");
  const handouts = props.filter((p) => p.role === "handout");

  async function drawRow(items, boxSize, topY) {
    const n = items.length;
    if (n === 0) return topY;
    const totalW = n * boxSize + (n - 1) * 20;
    const startX = (PAGE_W - totalW) / 2;
    for (let i = 0; i < items.length; i++) {
      const prop = items[i];
      const x = startX + i * (boxSize + 20);
      const slug = prop.name.toLowerCase().replace(/\s+/g, "_");
      const imgPath = path.join(propsDir, `${slug}.png`);
      await drawImageContain(pdfDoc, page, imgPath, x, topY, boxSize, boxSize);
      drawCenteredTextIn(page, prop.name, fonts.regular, 11, BLACK, topY + boxSize + 6, x, boxSize);
    }
    return topY + boxSize + 40;
  }

  let y = 110;
  y = await drawRow(characters, CHARACTER_BOX, y);
  await drawRow(handouts, HANDOUT_BOX, y);

  drawCenteredText(page, "Print, cut out, and use as hand props while telling the story.",
    fonts.oblique, 10, GRAY, PAGE_H - 40);
}

// Like drawCenteredText but centered within a sub-column (x..x+w), not the
// whole page - used for the caption under each prop image in the row.
function drawCenteredTextIn(page, text, font, size, color, yFromTop, colX, colW) {
  const w = font.widthOfTextAtSize(text, size);
  const x = colX + (colW - w) / 2;
  page.drawText(text, { x, y: toPdfY(yFromTop), size, font, color });
}

async function page2StoryBackground(pdfDoc, page, genDir) {
  const imgPath = path.join(genDir, "story_background.png");
  if (!fs.existsSync(imgPath)) return; // nothing to print - caller skips this page entirely

  const rawPng = PNG.sync.read(fs.readFileSync(imgPath));
  const isLandscape = rawPng.width > rawPng.height;
  const sourcePng = isLandscape ? rotatePng90(rawPng) : rawPng;
  const pngBytes = PNG.sync.write(sourcePng);
  const img = await pdfDoc.embedPng(pngBytes);

  // Full-bleed cover-fit: scale up to fill the whole page, center, let any
  // overflow run past the page edges (standard full-bleed print behavior -
  // viewers/printers clip to the page's own boundary automatically).
  const scale = Math.max(PAGE_W / img.width, PAGE_H / img.height);
  const w = img.width * scale, h = img.height * scale;
  const x = (PAGE_W - w) / 2, y = (PAGE_H - h) / 2;
  page.drawImage(img, { x, y, width: w, height: h });
}

async function pageFullStory(pdfDoc, makePage, fonts, content, hasImages) {
  let page = makePage();
  pageHeader(page, fonts.bold, "Full Story Script (for the Teacher)");
  const x = 50, w = 512;
  let cursorY = 100;

  function section(title) {
    page.drawText(title, { x, y: toPdfY(cursorY + 13), size: 13, font: fonts.bold, color: RED });
    cursorY += 13 + 6;
  }
  function paragraph(text) {
    const lines = wrapText(text, fonts.regular, 11, w);
    lines.forEach((line) => {
      ensureSpace(120);
      page.drawText(line, { x, y: toPdfY(cursorY + 11), size: 11, font: fonts.regular, color: BLACK });
      cursorY += 11 + 4;
    });
    cursorY += 6;
  }
  function ensureSpace(minSpaceFromBottom) {
    if (cursorY > PAGE_H - minSpaceFromBottom) {
      page = makePage();
      cursorY = 80;
    }
  }

  section("Short Summary");
  paragraph(content.story.short_summary);
  cursorY += 6;

  section("Materials");
  const bgNote = hasImages
    ? "Background: printed story background scene (see page 2)"
    : "Background: story background illustration (generate separately)";
  paragraph(bgNote);
  paragraph("Characters: " + content.story.characters.join(", "));
  paragraph("Objects: " + content.story_props.map((p) => p.name).join(", "));
  cursorY += 6;

  section("Full Story");
  content.story.full_story_speaker_notes.split(". ").forEach((raw) => {
    const s = raw.trim();
    if (!s) return;
    ensureSpace(120);
    paragraph(s.replace(/\.$/, "") + ".");
  });
  cursorY += 6;

  ensureSpace(150);
  section("Observation");
  content.story.observation_questions.forEach((q) => paragraph("- " + q));
}

async function page4GamePrintout(pdfDoc, page, genDir, content) {
  const colors = (content.game2 && content.game2.colors) || [];
  const n = colors.length;
  const cols = Math.min(n, 4) || 1;
  const rows = Math.ceil(n / cols) || 1;
  const margin = 40;
  const cellW = (PAGE_W - 2 * margin) / cols;
  const cellH = (PAGE_H - 2 * margin) / rows;
  for (let i = 0; i < colors.length; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const x = margin + col * cellW;
    const yFromTop = margin + row * cellH;
    const imgPath = path.join(genDir, `game2_${colors[i].toLowerCase()}.png`);
    await drawImageContain(pdfDoc, page, imgPath, x + 8, yFromTop + 8, cellW - 16, cellH - 16);
  }
}

// Generic bulk-print helper: tiles a flat list of image paths (each entry is
// ONE physical copy to cut out) across as many pages as needed, 3 per row.
// This is the mechanism behind every "print N physical copies" need in the
// deck - search_item, game2.print_items, and story_props handouts that go
// to every child (class_copies). Manages its own pagination via `makePage`.
async function pageBulkTiles(pdfDoc, makePage, fonts, title, note, imagePaths) {
  const existing = imagePaths.filter((p) => fs.existsSync(p));
  if (!existing.length) return; // nothing generated for this yet - skip rather than print a blank page
  const cols = 3;
  const perPage = cols * 3; // 3 rows/page keeps each copy a comfortable size for small hands
  for (let start = 0; start < existing.length; start += perPage) {
    const chunk = existing.slice(start, start + perPage);
    const page = makePage();
    pageHeader(page, fonts.bold, title);
    const rows = Math.ceil(chunk.length / cols);
    const margin = 30;
    const cellW = (PAGE_W - 2 * margin) / cols;
    const cellH = (PAGE_H - 130) / rows;
    for (let i = 0; i < chunk.length; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = margin + col * cellW;
      const yFromTop = 90 + row * cellH;
      await drawImageContain(pdfDoc, page, chunk[i], x + 12, yFromTop + 12, cellW - 24, cellH - 24);
    }
    drawCenteredText(page, note, fonts.oblique, 10, GRAY, PAGE_H - 40);
  }
}

// Tiles many copies of a single search_item on one page - needed when
// Game 2 is a "find N of the same thing" hunt (e.g. find 8 cactuses), since
// the teacher needs enough physical copies to actually hide.
async function pageSearchItemBulk(pdfDoc, makePage, fonts, genDir, content, copies = 8) {
  const searchItem = (content.game2 && content.game2.search_item) || {};
  const name = searchItem.name || "";
  const imgPath = path.join(genDir, "game2_search_item.png");
  await pageBulkTiles(
    pdfDoc, makePage, fonts,
    `Find the ${name} - Cut Out ${copies} Copies`,
    `Print and cut out all ${copies} - hide them around the room for the search game.`,
    Array(copies).fill(imgPath)
  );
}

// game2.print_items: the generic matching/sorting/compare/pattern print set.
// One image per distinct item, repeated by that item's own `copies` - e.g. a
// "floats/dives" sort with 4 copies each tiles 8 cards total, 4 of each,
// together on the same page(s). This is what the duck-sorting bug needed and
// never had: without an entry here (or search_item/colors), a game that asks
// kids to sort/match/compare a real-world item prints nothing for it.
async function pageGamePrintItems(pdfDoc, makePage, fonts, genDir, content) {
  const printItems = (content.game2 && content.game2.print_items) || [];
  if (!printItems.length) return;
  const imagePaths = [];
  printItems.forEach((item) => {
    const slug = (item.name || "").toLowerCase().replace(/\s+/g, "_");
    const imgPath = path.join(genDir, `game2_item_${slug}.png`);
    const copies = Math.max(1, Number(item.copies) || 1);
    for (let i = 0; i < copies; i++) imagePaths.push(imgPath);
  });
  await pageBulkTiles(
    pdfDoc, makePage, fonts,
    (content.game2 && content.game2.title) || "Game 2 - Cut Out These Cards",
    "Print and cut out - use for the sorting/matching/comparing game.",
    imagePaths
  );
}

// DEPRECATED single-image fallback (content.game2.printout_prompt) - only
// reached when print_items is absent, so old content.json files that
// predate print_items still get SOMETHING printed instead of nothing.
async function pagePrintoutFallback(pdfDoc, page, fonts, genDir, content) {
  const imgPath = path.join(genDir, "game2_printout.png");
  if (!fs.existsSync(imgPath)) return;
  pageHeader(page, fonts.bold, (content.game2 && content.game2.title) || "Game 2 Printout");
  await drawImageContain(pdfDoc, page, imgPath, 60, 100, PAGE_W - 120, PAGE_H - 200);
}

// story_props handouts that each child gets their OWN copy of during the
// story (class_copies set) - separate from the single storytelling cutout
// already printed on page 1 (Story Props).
async function pageHandoutClassCopies(pdfDoc, makePage, fonts, propsDir, content) {
  const handouts = (content.story_props || []).filter(
    (p) => p.role === "handout" && Number(p.class_copies) > 1
  );
  for (const prop of handouts) {
    const slug = prop.name.toLowerCase().replace(/\s+/g, "_");
    const imgPath = path.join(propsDir, `${slug}.png`);
    const copies = Number(prop.class_copies);
    await pageBulkTiles(
      pdfDoc, makePage, fonts,
      `${prop.name} - Cut Out ${copies} Copies`,
      `Print and cut out all ${copies} - hand one to each child.`,
      Array(copies).fill(imgPath)
    );
  }
}

async function page5PatternSheet(pdfDoc, page, fonts, content) {
  const letter = content.letter.toUpperCase();
  drawCenteredText(page, `Build the Letter ${letter} - Brick Pattern`, fonts.bold, 16, DARKGRAY, 44);

  const imgPath = path.join(ROOT, "assets", "letters", `${letter}_pattern.png`);
  // As large as possible: minimal print-safe margins, no artificial downscale.
  const topClearance = 90, bottomMargin = 30, sideMargin = 30;
  const boxW = PAGE_W - 2 * sideMargin;
  const boxH = PAGE_H - topClearance - bottomMargin;
  await drawImageContain(pdfDoc, page, imgPath, sideMargin, topClearance, boxW, boxH);
}

async function main() {
  const contentArg = process.argv[2];
  if (!contentArg) {
    console.log("Usage: build-print-pdf.js content/<topic>.json");
    process.exit(1);
  }
  const content = JSON.parse(fs.readFileSync(contentArg, "utf8"));
  const slug = content.topic.toLowerCase().replace(/\s+/g, "_");
  const dataDir = process.env.BRICK_DATA_DIR || ROOT;
  const genDir = path.join(dataDir, "assets", "generated", slug);
  const propsDir = genDir;
  const outDir = path.join(dataDir, "output");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${slug}_printables.pdf`);

  // "text mode": no API key -> no AI images -> only worth assembling the
  // full-story page (the other pages are useless without images)
  const hasImages = fs.existsSync(path.join(genDir, "story_background.png"));

  const pdfDoc = await PDFDocument.create();
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    oblique: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
  };
  const makePage = () => pdfDoc.addPage([PAGE_W, PAGE_H]);

  if (hasImages) {
    await page1StoryProps(pdfDoc, makePage(), fonts, content, propsDir);

    if (fs.existsSync(path.join(genDir, "story_background.png"))) {
      await page2StoryBackground(pdfDoc, makePage(), genDir);
    }

    await pageFullStory(pdfDoc, makePage, fonts, content, true);

    if (content.game2 && content.game2.colors && content.game2.colors.length) {
      await page4GamePrintout(pdfDoc, makePage(), genDir, content);
    }
    if (content.game2 && content.game2.search_item) {
      await pageSearchItemBulk(pdfDoc, makePage, fonts, genDir, content);
    }
    if (content.game2 && content.game2.print_items && content.game2.print_items.length) {
      await pageGamePrintItems(pdfDoc, makePage, fonts, genDir, content);
    } else if (content.game2 && content.game2.printout_prompt) {
      await pagePrintoutFallback(pdfDoc, makePage(), fonts, genDir, content);
    }
    await pageHandoutClassCopies(pdfDoc, makePage, fonts, propsDir, content);

    await page5PatternSheet(pdfDoc, makePage(), fonts, content);
  } else {
    console.log("No images found (no API key) - building story-only page.");
    await pageFullStory(pdfDoc, makePage, fonts, content, false);
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outPath, pdfBytes);
  console.log("Written:", outPath);
}

main().catch((err) => {
  console.error("Failed to build PDF:", err.message);
  process.exit(1);
});
