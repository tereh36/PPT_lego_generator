#!/usr/bin/env node
/**
 * build-print-pdf.js content/<topic>.json
 *
 * Node/pdfkit port of the former build-print-pdf.py. Ported so the app
 * never needs a separate system Python install on the end user's machine
 * (same reasoning as running build-pptx.js through Electron's own bundled
 * Node runtime instead of a system "node" - see main.js's runStep()).
 *
 * Builds the printable companion PDF following the exact structure from
 * DESIGN_SYSTEM.md (5 pages, Letter format, portrait):
 *   1. Story Props (with captions, the only page with text on the images)
 *   2. Story Background (full-bleed, no captions, auto-rotated if landscape)
 *   3. Full Story Script (for the Teacher) - Short Summary / Materials / Full Story / Observation
 *   4. Game printout (no text)
 *   5. Pattern Sheet (as large as possible, matching the topic's letter)
 *
 * Rule: images are the same files used in the presentation, contain-fit, no
 * custom cropping.
 *
 * NOTE on coordinates: pdfkit's origin is TOP-LEFT with y increasing
 * downward. The old reportlab script used BOTTOM-LEFT with y increasing
 * upward. Every y-coordinate below is the top-down equivalent of the old
 * one, not a literal copy of the old numbers - don't diff them line by line
 * against build-print-pdf.py, compare the rendered PDFs instead.
 */
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const PAGE_W = 612, PAGE_H = 792; // Letter, portrait - NEVER change orientation
const RED = "#D03331";
const DARKGRAY = "#404040";
const GRAY = "#888888";

const ROOT = path.dirname(__dirname); // .../engine

function pageHeader(doc, title) {
  doc.font("Helvetica-Bold").fontSize(20).fillColor(DARKGRAY);
  doc.text(title, 40, 40, { width: PAGE_W - 80, align: "center" });
  doc.strokeColor(RED).lineWidth(2);
  doc.moveTo(50, 62).lineTo(562, 62).stroke();
}

// Draws an image contain-fit (whole image visible, letterboxed) inside a box.
// pdfkit's built-in `fit` option does exactly this - no manual aspect-ratio
// math needed (that's what the old Python contain_fit_box() had to do by
// hand by reading the image with Pillow first).
function drawImageContain(doc, imgPath, boxX, boxY, boxW, boxH) {
  if (!fs.existsSync(imgPath)) return;
  doc.image(imgPath, boxX, boxY, { fit: [boxW, boxH], align: "center", valign: "center" });
}

function page1StoryProps(doc, content, propsDir) {
  pageHeader(doc, "Story Props - Cut Out & Use During Storytelling");
  const props = content.story_props || [];

  // Fixed target sizes by role, not "divide the page evenly" - that produced
  // illogical proportions (a tiny character or a giant carrot). A character
  // prints at roughly a quarter of the page; a handout item (something given
  // to/eaten by kids - a carrot, a leaf, a cactus) prints noticeably smaller
  // but never below a size a 3-4 year old can comfortably hold.
  const CHARACTER_BOX = 300; // ~ a quarter of a Letter page
  const HANDOUT_BOX = 170;   // floor size for a small handheld item
  const characters = props.filter((p) => (p.role || "character") === "character");
  const handouts = props.filter((p) => p.role === "handout");

  function drawRow(items, boxSize, topY) {
    const n = items.length;
    if (n === 0) return topY;
    const totalW = n * boxSize + (n - 1) * 20;
    const startX = (PAGE_W - totalW) / 2;
    items.forEach((prop, i) => {
      const x = startX + i * (boxSize + 20);
      const slug = prop.name.toLowerCase().replace(/\s+/g, "_");
      const imgPath = path.join(propsDir, `${slug}.png`);
      drawImageContain(doc, imgPath, x, topY, boxSize, boxSize);
      doc.font("Helvetica").fontSize(11).fillColor("black");
      doc.text(prop.name, x, topY + boxSize + 6, { width: boxSize, align: "center" });
    });
    return topY + boxSize + 40;
  }

  let y = 110;
  y = drawRow(characters, CHARACTER_BOX, y);
  drawRow(handouts, HANDOUT_BOX, y);

  doc.font("Helvetica-Oblique").fontSize(10).fillColor(GRAY);
  doc.text("Print, cut out, and use as hand props while telling the story.", 0, PAGE_H - 50, {
    width: PAGE_W, align: "center"
  });
}

function page2StoryBackground(doc, genDir) {
  const imgPath = path.join(genDir, "story_background.png");
  if (!fs.existsSync(imgPath)) return; // nothing to print - caller skips this page entirely

  const img = doc.openImage(imgPath);
  const isLandscape = img.width > img.height;

  // Full-bleed: fill the entire page, edge cropping is fine, no distortion.
  // pdfkit's `cover` option does exactly this (scale to fill, crop overflow).
  if (isLandscape) {
    // Rotate the IMAGE 90deg (not the page) so it fills the vertical page
    // properly, same as the old script's PIL rotate + re-save. Done via a
    // save/rotate/restore block around a single drawImage call, no need to
    // write a separate rotated file to disk first.
    doc.save();
    doc.rotate(90, { origin: [PAGE_W / 2, PAGE_H / 2] });
    // After a 90deg rotation the effective drawing box is swapped (H x W
    // instead of W x H) relative to the page.
    doc.image(imgPath, (PAGE_H - PAGE_W) / 2, (PAGE_W - PAGE_H) / 2, {
      cover: [PAGE_H, PAGE_W], align: "center", valign: "center"
    });
    doc.restore();
  } else {
    doc.image(imgPath, 0, 0, { cover: [PAGE_W, PAGE_H], align: "center", valign: "center" });
  }
}

function pageFullStory(doc, content, hasImages, nextPage) {
  pageHeader(doc, "Full Story Script (for the Teacher)");
  const x = 50, w = 512;
  doc.y = 100;

  function section(title) {
    doc.font("Helvetica-Bold").fontSize(13).fillColor(RED);
    doc.text(title, x, doc.y, { width: w });
    doc.moveDown(0.3);
    doc.fillColor("black");
  }
  function paragraph(text) {
    doc.font("Helvetica").fontSize(11).fillColor("black");
    doc.text(text, x, doc.y, { width: w });
    doc.moveDown(0.3);
  }
  function ensureSpace(minSpaceFromBottom) {
    if (doc.y > PAGE_H - minSpaceFromBottom) {
      nextPage();
      doc.y = 80;
    }
  }

  section("Short Summary");
  paragraph(content.story.short_summary);
  doc.moveDown(0.5);

  section("Materials");
  const bgNote = hasImages
    ? "Background: printed story background scene (see page 2)"
    : "Background: story background illustration (generate separately)";
  paragraph(bgNote);
  paragraph("Characters: " + content.story.characters.join(", "));
  paragraph("Objects: " + content.story_props.map((p) => p.name).join(", "));
  doc.moveDown(0.5);

  section("Full Story");
  content.story.full_story_speaker_notes.split(". ").forEach((raw) => {
    const s = raw.trim();
    if (!s) return;
    ensureSpace(120);
    paragraph(s.replace(/\.$/, "") + ".");
  });
  doc.moveDown(0.5);

  ensureSpace(150);
  section("Observation");
  content.story.observation_questions.forEach((q) => paragraph("- " + q));
}

function page4GamePrintout(doc, genDir, content) {
  const colors = (content.game2 && content.game2.colors) || [];
  const n = colors.length;
  const cols = Math.min(n, 4);
  const rows = Math.ceil(n / cols);
  const margin = 40;
  const cellW = (PAGE_W - 2 * margin) / cols;
  const cellH = (PAGE_H - 2 * margin) / rows;
  colors.forEach((color, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = margin + col * cellW;
    const y = margin + row * cellH;
    const imgPath = path.join(genDir, `game2_${color.toLowerCase()}.png`);
    drawImageContain(doc, imgPath, x + 8, y + 8, cellW - 16, cellH - 16);
  });
}

// Tiles many copies of a single search_item on one page - needed when
// Game 2 is a "find N of the same thing" hunt (e.g. find 8 cactuses), since
// the teacher needs enough physical copies to actually hide. 3 columns (not
// 4) keeps each copy a comfortable size for small hands, not shrunk down
// just to cram everything onto one page.
function pageSearchItemBulk(doc, genDir, content, copies = 8) {
  const searchItem = (content.game2 && content.game2.search_item) || {};
  const name = searchItem.name || "";
  const imgPath = path.join(genDir, "game2_search_item.png");
  if (!fs.existsSync(imgPath)) return; // image was never generated - skip rather than print a blank page

  pageHeader(doc, `Find the ${name} - Cut Out ${copies} Copies`);
  const cols = 3;
  const rows = Math.ceil(copies / cols);
  const margin = 30;
  const cellW = (PAGE_W - 2 * margin) / cols;
  const cellH = (PAGE_H - 130) / rows;
  for (let i = 0; i < copies; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const x = margin + col * cellW;
    const y = 90 + row * cellH;
    drawImageContain(doc, imgPath, x + 12, y + 12, cellW - 24, cellH - 24);
  }
  doc.font("Helvetica-Oblique").fontSize(10).fillColor(GRAY);
  doc.text(`Print and cut out all ${copies} - hide them around the room for the search game.`, 0, PAGE_H - 50, {
    width: PAGE_W, align: "center"
  });
}

function page5PatternSheet(doc, content) {
  const letter = content.letter.toUpperCase();
  doc.font("Helvetica-Bold").fontSize(16).fillColor(DARKGRAY);
  doc.text(`Build the Letter ${letter} - Brick Pattern`, 0, 44, { width: PAGE_W, align: "center" });

  const imgPath = path.join(ROOT, "assets", "letters", `${letter}_pattern.png`);
  // As large as possible: minimal print-safe margins, no artificial downscale.
  const topClearance = 90, bottomMargin = 30, sideMargin = 30;
  const boxW = PAGE_W - 2 * sideMargin;
  const boxH = PAGE_H - topClearance - bottomMargin;
  drawImageContain(doc, imgPath, sideMargin, topClearance, boxW, boxH);
}

function main() {
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
  // full-story page (the other 4 pages are useless without images)
  const hasImages = fs.existsSync(path.join(genDir, "story_background.png"));

  const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });
  const outStream = fs.createWriteStream(outPath);
  doc.pipe(outStream);

  let firstPageUsed = false;
  function nextPage() {
    if (firstPageUsed) doc.addPage();
    firstPageUsed = true;
  }

  if (hasImages) {
    nextPage();
    page1StoryProps(doc, content, propsDir);

    if (fs.existsSync(path.join(genDir, "story_background.png"))) {
      nextPage();
      page2StoryBackground(doc, genDir);
    }

    nextPage();
    pageFullStory(doc, content, true, nextPage);

    if (content.game2 && content.game2.colors && content.game2.colors.length) {
      nextPage();
      page4GamePrintout(doc, genDir, content);
    }
    if (content.game2 && content.game2.search_item) {
      nextPage();
      pageSearchItemBulk(doc, genDir, content);
    }

    nextPage();
    page5PatternSheet(doc, content);
  } else {
    console.log("No images found (no API key) - building story-only page.");
    nextPage();
    pageFullStory(doc, content, false, nextPage);
  }

  doc.end();
  outStream.on("finish", () => {
    console.log("Written:", outPath);
  });
  outStream.on("error", (err) => {
    console.error("Failed to write PDF:", err.message);
    process.exit(1);
  });
}

main();
