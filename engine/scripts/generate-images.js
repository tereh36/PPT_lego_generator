/**
 * generate-images.js
 * Читает content/<topic>.json, находит все *_prompt поля,
 * генерирует картинки через OpenAI Images API и сохраняет их
 * в правильные папки под правильными именами, которые ожидает build-pptx.js.
 *
 * ЗАПУСКАТЬ ТОЛЬКО ЛОКАЛЬНО У СЕБЯ. Ключ лежит в .env, никогда никому не
 * пересылается и не появляется в чате с Claude.
 *
 * Использование:
 *   OPENAI_API_KEY=sk-... node scripts/generate-images.js content/umbrella.json
 * или создайте .env (см. .env.example) и запустите просто:
 *   node scripts/generate-images.js content/umbrella.json
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

if (!API_KEY) {
  console.error("OPENAI_API_KEY не найден. Создайте .env из .env.example.");
  process.exit(1);
}

async function generateImage(prompt, size = "1024x1024") {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, prompt, size, n: 1 }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const b64 = data.data[0].b64_json;
  if (b64) return Buffer.from(b64, "base64");
  // fallback: url response
  const url = data.data[0].url;
  const imgRes = await fetch(url);
  return Buffer.from(await imgRes.arrayBuffer());
}

async function saveImage(buf, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buf);
  console.log("Saved:", filePath);
}

async function main() {
  const contentPath = process.argv[2];
  if (!contentPath) {
    console.error("Usage: node scripts/generate-images.js content/<topic>.json");
    process.exit(1);
  }
  const content = JSON.parse(fs.readFileSync(path.resolve(contentPath), "utf8"));
  const slug = content.topic.toLowerCase().replace(/\s+/g, "_");
  const genDir = path.join(ASSETS, "generated", slug);
  const propsDir = path.join(ASSETS, "story_props", slug);

  const jobs = [];

  // story background (horizontal, per DESIGN_SYSTEM rule)
  jobs.push({
    prompt: content.story.background_image_prompt,
    out: path.join(genDir, "story_background.png"),
    size: "1536x1024",
  });

  // реальное фото объекта темы (не LEGO) - генерируется, не присылается пользователем
  if (content.real_object_image_prompt) {
    jobs.push({
      prompt: content.real_object_image_prompt,
      out: path.join(genDir, "real_object.png"),
      size: "1024x1024",
    });
  }

  // story props
  content.story_props.forEach((p) => {
    const slugP = p.name.toLowerCase().replace(/\s+/g, "_");
    jobs.push({ prompt: p.image_prompt, out: path.join(propsDir, `prop_${slugP}.png`), size: "1024x1024" });
  });

  // challenge illustration
  if (content.challenge && content.challenge.challenge_image_prompt) {
    jobs.push({ prompt: content.challenge.challenge_image_prompt, out: path.join(genDir, "challenge.png"), size: "1024x1024" });
  }

  // game 2 visuals (для типов, отличных от color_matching — тот перекрашивается отдельно, см. recolor-game2.py)
  const g2 = content.game2 || {};
  if (g2.type === "shape_build") {
    if (g2.shape_reference_prompt) jobs.push({ prompt: g2.shape_reference_prompt, out: path.join(genDir, "game2_shape_reference.png"), size: "1024x1024" });
    if (g2.shape_pieces_prompt) jobs.push({ prompt: g2.shape_pieces_prompt, out: path.join(genDir, "game2_shape_pieces.png"), size: "1024x1024" });
  } else if (g2.printout_prompt) {
    // deprecated single-image field, kept for old content.json files - see content.schema.md
    jobs.push({ prompt: g2.printout_prompt, out: path.join(genDir, "game2_printout.png"), size: "1024x1024" });
  }
  // print_items - the generic matching/sorting/compare/pattern print set (one
  // image per distinct card; build-print-pdf.js tiles each by its own "copies").
  (g2.print_items || []).forEach((item) => {
    if (!item.image_prompt) return;
    const slug = (item.name || "").toLowerCase().replace(/\s+/g, "_");
    jobs.push({ prompt: item.image_prompt, out: path.join(genDir, `game2_item_${slug}.png`), size: "1024x1024" });
  });

  console.log(`Generating ${jobs.length} image(s) for topic "${content.topic}"...`);
  for (const job of jobs) {
    if (fs.existsSync(job.out)) {
      console.log("Skip (exists):", job.out);
      continue;
    }
    console.log("Generating:", job.out);
    try {
      const buf = await generateImage(job.prompt, job.size);
      await saveImage(buf, job.out);
    } catch (e) {
      console.error("FAILED:", job.out, e.message);
    }
  }

  console.log("\nDone. NOT auto-generated (must come from you physically):");
  console.log(" - step-by-step build photos -> assets/steps/" + slug + "/*.jpg");
  console.log(" - cover model photo -> assets/generated/" + slug + "/cover_model.png");
  console.log(" - our goal easy/hard photos -> assets/generated/" + slug + "/goal_easy.png, goal_hard.png");

  if (content.game2 && content.game2.colors) {
    console.log("\nTip: for Game 2 color variants, run scripts/recolor-game2.py after placing the base prop image, instead of generating each color separately.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
