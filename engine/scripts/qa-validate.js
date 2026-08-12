#!/usr/bin/env node
/**
 * qa-validate.js <file.pptx> [content.json]
 *
 * Node port of qa-validate.py - see checks below for what each one does.
 * Ported so the app never needs a separate system Python install (same
 * reasoning as build-pptx.js / build-print-pdf.js already being Node).
 *
 * External LibreOffice ("soffice") is still optional and still gracefully
 * skipped if not found - that was never a Python dependency, it's a
 * separate document-converter tool, and skipping it was always the
 * intended fallback on a machine that doesn't have it installed.
 *
 * python-pptx / pdfplumber / markitdown / Pillow are replaced with:
 *   - jszip + fast-xml-parser to read shape bounds directly from the
 *     .pptx's own XML (a .pptx is just a zip of XML files)
 *   - the same XML pass also collects all slide text, reused for the text
 *     hygiene check instead of a separate markitdown conversion
 *   - pdfjs-dist to inspect the LibreOffice-rendered PDF's real text/image
 *     bounding boxes
 *   - pngjs to read PNG alpha channels directly for the crop-detection
 *     heuristic
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const JSZip = require("jszip");
const { XMLParser } = require("fast-xml-parser");
const { PNG } = require("pngjs");

function asArray(x) {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

// ---------- 0/4 content lint ----------
function lintContent(contentPath, problems) {
  const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));

  const qa = content.presentation_qa || [];
  if (qa.length < 4) {
    problems.push(`content.json: presentation_qa has only ${qa.length} question(s), minimum is 4.`);
  }

  const props = content.story_props || [];
  if (props.length > 4) {
    problems.push(`content.json: story_props has ${props.length} items, keep it minimal (max ~4).`);
  }
  props.forEach((prop) => {
    if (!["character", "handout"].includes(prop.role)) {
      problems.push(
        `content.json: story_props item '${prop.name || "?"}' is missing a valid 'role' ` +
        `(character/handout) - printing can't size it correctly without this.`
      );
    }
  });

  const game2 = content.game2 || {};
  if (game2.type === "search" && game2.search_item && !game2.search_item.image_prompt) {
    problems.push("content.json: game2.search_item is set but missing image_prompt.");
  }

  ["game1", "game2", "game3"].forEach((key) => {
    const game = content[key] || {};
    if (!game.script || !game.script.length) {
      problems.push(`content.json: ${key}.script is missing or empty (unified script format required).`);
    }
  });

  const topic = (content.topic || "").toLowerCase();
  const summary = ((content.story || {}).short_summary || "").toLowerCase();
  if (topic && !summary.includes(topic)) {
    problems.push(
      `content.json: WARNING - story.short_summary does not mention the topic word ` +
      `'${content.topic}'. Double-check the story leads to building the ${content.topic} ` +
      `model itself, not a derivative object (a derivative like a home/container belongs in Challenge).`
    );
  }
}

// ---------- 0b/4 video availability ----------
async function checkVideoAvailability(contentPath, problems, warnings) {
  const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));

  const idsToCheck = {};
  if (content.intro_video_youtube_id) idsToCheck["intro_video_youtube_id"] = content.intro_video_youtube_id;
  idsToCheck["alphabet (constant)"] = "-1jxqVy5SlA";
  idsToCheck["closing (constant)"] = "h2AndZKYZBQ";

  const letter = (content.letter || "").toUpperCase();
  const letterVideosPath = path.join(__dirname, "letter-videos.json");
  if (fs.existsSync(letterVideosPath)) {
    const letterVideos = JSON.parse(fs.readFileSync(letterVideosPath, "utf8"));
    if (letterVideos[letter]) idsToCheck[`letter-specific (${letter})`] = letterVideos[letter];
  }

  for (const [label, vid] of Object.entries(idsToCheck)) {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.status === 404 || res.status === 401) {
        problems.push(`Video UNAVAILABLE: ${label} (id=${vid}) - oEmbed returned ${res.status} (video deleted/private/nonexistent). Replace this youtube id.`);
      } else if (res.status !== 200) {
        warnings.push(`Video check inconclusive for ${label} (id=${vid}): oEmbed returned ${res.status}. Often network restriction/rate limiting rather than a bad video - verify manually at https://youtube.com/watch?v=${vid} if unsure.`);
      }
    } catch (e) {
      warnings.push(`Video check: ${label} (id=${vid}) could not be verified (${e.message}). Check manually or verify internet access.`);
    }
  }
}

// ---------- 0c/4 image crop check ----------
function checkImageCropping(contentPath, problems) {
  const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  const slug = content.topic.toLowerCase().replace(/\s+/g, "_");
  const dataDir = process.env.BRICK_DATA_DIR || path.join(__dirname, "..");
  const genDir = path.join(dataDir, "assets", "generated", slug);

  const targets = ["real_object.png"];
  (content.story_props || []).forEach((p) => targets.push(p.name.toLowerCase().replace(/\s+/g, "_") + ".png"));

  const THRESHOLD = 0.12; // 12%+ opaque pixels touching an edge -> likely cropped

  targets.forEach((fname) => {
    const imgPath = path.join(genDir, fname);
    if (!fs.existsSync(imgPath)) return;
    let png;
    try {
      png = PNG.sync.read(fs.readFileSync(imgPath));
    } catch (e) {
      return;
    }
    const { width: w, height: h, data } = png; // RGBA buffer, 4 bytes/px
    const alphaAt = (x, y) => data[((w * y + x) << 2) + 3];
    const edgeRatio = (coords) => {
      if (!coords.length) return 0;
      let opaque = 0;
      coords.forEach(([x, y]) => { if (alphaAt(x, y) > 200) opaque++; });
      return opaque / coords.length;
    };

    const stepW = Math.max(1, Math.floor(w / 200));
    const stepH = Math.max(1, Math.floor(h / 200));
    const top = [], bottom = [], left = [], right = [];
    for (let x = 0; x < w; x += stepW) { top.push([x, 0]); bottom.push([x, h - 1]); }
    for (let y = 0; y < h; y += stepH) { left.push([0, y]); right.push([w - 1, y]); }

    const worst = Math.max(edgeRatio(top), edgeRatio(bottom), edgeRatio(left), edgeRatio(right));
    if (worst > THRESHOLD) {
      problems.push(
        `${fname}: subject appears to touch the image edge (${Math.round(worst * 100)}% of an edge is opaque) ` +
        `- likely cropped (e.g. ears/tail cut off). Regenerate with a prompt that leaves clear margin ` +
        `around the full subject.`
      );
    }
  });
}

// ---------- 1/3 schema validation (bounds check) + text collection ----------
function extractText(node) {
  let out = "";
  if (!node || typeof node !== "object") return out;
  if (node["a:t"] !== undefined) {
    const t = node["a:t"];
    out += typeof t === "string" ? t : (t && t["#text"]) || "";
  }
  for (const key of Object.keys(node)) {
    if (key === "a:t") continue;
    const val = node[key];
    if (Array.isArray(val)) val.forEach((v) => (out += extractText(v)));
    else if (typeof val === "object") out += extractText(val);
  }
  return out;
}

async function schemaValidateAndCollectText(pptxPath, problems, allTextOut) {
  const zip = await JSZip.loadAsync(fs.readFileSync(pptxPath));
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

  const presoXml = await zip.file("ppt/presentation.xml").async("string");
  const presoDoc = parser.parse(presoXml);
  const sldSz = presoDoc["p:presentation"]["p:sldSz"];
  const sw = Number(sldSz["@_cx"]), sh = Number(sldSz["@_cy"]);
  const tolerance = 9525 * 2; // ~2pt margin for rounding

  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => Number(a.match(/slide(\d+)\.xml/)[1]) - Number(b.match(/slide(\d+)\.xml/)[1]));

  for (let i = 0; i < slideFiles.length; i++) {
    const slideNum = i + 1;
    const xml = await zip.file(slideFiles[i]).async("string");
    const doc = parser.parse(xml);
    if (allTextOut) allTextOut.push(extractText(doc));

    const spTree = doc["p:sld"] && doc["p:sld"]["p:cSld"] && doc["p:sld"]["p:cSld"]["p:spTree"];
    if (!spTree) continue;

    // top-level shapes only (matches python-pptx's default shallow iteration):
    // p:sp = text box/shape, p:pic = image, p:graphicFrame = table/chart
    for (const tag of ["p:sp", "p:pic", "p:graphicFrame"]) {
      for (const shape of asArray(spTree[tag])) {
        const spPr = shape["p:spPr"] || shape["p:grpSpPr"] || {};
        const xfrm = spPr["a:xfrm"] || shape["p:xfrm"];
        if (!xfrm || !xfrm["a:off"] || !xfrm["a:ext"]) continue;
        const left = Number(xfrm["a:off"]["@_x"]);
        const top = Number(xfrm["a:off"]["@_y"]);
        const width = Number(xfrm["a:ext"]["@_cx"]);
        const height = Number(xfrm["a:ext"]["@_cy"]);
        if ([left, top, width, height].some((n) => Number.isNaN(n))) continue;

        const hasText = tag === "p:sp" && extractText(shape["p:txBody"] || {}).trim().length > 0;
        const isPicture = tag === "p:pic";
        if (!hasText && !isPicture) continue; // decorative shape - edge-bleed is fine

        if (left < -tolerance || top < -tolerance) {
          problems.push(`Slide ${slideNum}: shape starts outside left/top bounds.`);
        }
        if (left + width > sw + tolerance) {
          problems.push(`Slide ${slideNum}: shape overflows right edge (x+w=${left + width}, slide width=${sw}).`);
        }
        if (top + height > sh + tolerance) {
          problems.push(`Slide ${slideNum}: shape overflows bottom edge (y+h=${top + height}, slide height=${sh}).`);
        }
      }
    }
  }
}

// ---------- 2/3 LibreOffice + pdf.js bounding-box check (optional) ----------
function findSoffice() {
  const whichCmd = process.platform === "win32" ? "where" : "which";
  for (const name of ["soffice", "libreoffice", "soffice.exe"]) {
    const r = spawnSync(whichCmd, [name], { encoding: "utf8" });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim().split(/\r?\n/)[0].trim();
  }
  const commonWinPaths = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ];
  for (const p of commonWinPaths) if (fs.existsSync(p)) return p;
  return null;
}

async function boundingBoxCheck(pptxPath, problems) {
  const soffice = findSoffice();
  if (!soffice) {
    console.log("LibreOffice not found on this computer - skipping the text/image overflow check.");
    console.log("(This is not an error. Open the presentation in PowerPoint and check the");
    console.log(" slides by eye, especially whether text overlaps neighboring elements.)");
    return;
  }

  const base = pptxPath.replace(/\.pptx$/i, "");
  const pdfPath = base + ".pdf";
  const r = spawnSync(soffice, ["--headless", "--convert-to", "pdf", pptxPath], {
    cwd: path.dirname(pptxPath), encoding: "utf8",
  });
  console.log(r.stdout, r.stderr);

  if (!fs.existsSync(pdfPath)) {
    problems.push(`PDF render not found at ${pdfPath}, could not run bounding-box QA.`);
    return;
  }

  const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;

  const multiply = (m1, m2) => [
    m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const pw = viewport.width, ph = viewport.height;

    // ---- text bounding boxes ----
    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
      if (!item.str || !item.str.trim()) continue;
      const x0 = item.transform[4];
      const yBase = item.transform[5];
      const w = item.width;
      const h = item.height || Math.abs(item.transform[3]) || 10;
      const x1 = x0 + w;
      const top = ph - (yBase + h);
      const bottom = ph - yBase;
      if (x0 < -1 || x1 > pw + 1 || top < -1 || bottom > ph + 1) {
        problems.push(`Slide ${i}: text '${item.str}' overflows page bounds (x0=${x0.toFixed(1)}, x1=${x1.toFixed(1)}, page width=${pw.toFixed(1)})`);
      }
    }

    // ---- image bounding boxes (walk the operator list, track the CTM) ----
    const opList = await page.getOperatorList();
    const OPS = pdfjsLib.OPS;
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack = [];
    for (let idx = 0; idx < opList.fnArray.length; idx++) {
      const fn = opList.fnArray[idx];
      const args = opList.argsArray[idx];
      if (fn === OPS.save) {
        stack.push(ctm);
      } else if (fn === OPS.restore) {
        ctm = stack.pop() || ctm;
      } else if (fn === OPS.transform) {
        ctm = multiply(ctm, args);
      } else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
        const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [
          ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5],
        ]);
        const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
        const x0 = Math.min(...xs), x1 = Math.max(...xs);
        const top = ph - Math.max(...ys), bottom = ph - Math.min(...ys);
        if (x0 < -1 || x1 > pw + 1 || top < -1 || bottom > ph + 1) {
          problems.push(`Slide ${i}: image overflows page bounds`);
        }
      }
    }
  }
}

// ---------- 3/3 text hygiene (em-dash, placeholders) ----------
function textHygieneCheck(allText, problems) {
  const text = allText.join("\n");
  if (text.includes("\u2014")) {
    problems.push("Found an em dash (\u2014) - replace with comma/colon per style rules.");
  }
  if (/\bTODO\b|\[insert|xxx/i.test(text)) {
    problems.push("Found placeholder text (TODO / [insert / xxx) left in the deck.");
  }
}

async function main() {
  if (!process.argv[2]) {
    console.log("Usage: qa-validate.js <file.pptx> [content.json]");
    process.exit(1);
  }
  const pptxPath = path.resolve(process.argv[2]);
  const contentArg = process.argv[3];

  const problems = [];
  const warnings = [];
  const allText = [];

  if (contentArg) {
    const contentPath = path.resolve(contentArg);
    console.log("== 0/4 Content lint ==");
    lintContent(contentPath, problems);
    problems.forEach((p) => console.log("LINT:", p));

    console.log("== 0b/4 Video availability (youtube oEmbed, needs internet) ==");
    await checkVideoAvailability(contentPath, problems, warnings);
    warnings.forEach((w) => console.log("VIDEO WARNING:", w));
    problems.filter((p) => p.startsWith("Video UNAVAILABLE")).forEach((p) => console.log("VIDEO FAIL:", p));

    console.log("== 0c/4 Image crop check ==");
    checkImageCropping(contentPath, problems);
  }

  console.log("== 1/3 Schema validation (bounds check) ==");
  await schemaValidateAndCollectText(pptxPath, problems, allText);

  console.log("== 2/3 Rendering to PDF for bounding-box check ==");
  await boundingBoxCheck(pptxPath, problems);

  console.log("== 3/3 Text hygiene (em-dash, placeholders) ==");
  textHygieneCheck(allText, problems);

  console.log("\n==================== QA SUMMARY ====================");
  if (problems.length) {
    problems.forEach((p) => console.log("FAIL:", p));
    console.log(`\n${problems.length} problem(s) found. Fix before sending to the user.`);
    process.exit(1);
  } else {
    console.log("All QA checks passed.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("qa-validate.js crashed:", err);
  process.exit(1);
});
