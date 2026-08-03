#!/usr/bin/env node
/**
 * generate-content.js "Topic Word" [output_path]
 *
 * Генерирует content.json под тему через OpenAI Chat Completions API,
 * встраивая CONTENT_GENERATION_GUIDE.md + ключевые разделы Preschool_Rulebook.md
 * как system prompt. Это автоматическая версия того, что Claude делает вручную
 * в чате — качество может быть чуть ниже, чем при живом диалоге с фидбеком,
 * но следует всем письменным правилам.
 *
 * Требует OPENAI_API_KEY в .env (тот же ключ, что для картинок).
 *
 * Использование:
 *   node scripts/generate-content.js "Cactus"
 *   node scripts/generate-content.js "Cactus" content/cactus.json
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o";

function readIfExists(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function buildSystemPrompt() {
  const guide = readIfExists(path.join(ROOT, "CONTENT_GENERATION_GUIDE.md"));
  const schema = readIfExists(path.join(ROOT, "content", "content.schema.md"));

  return `You are the story-writer and challenge-generator for a LEGO Preschool (ages 3-5) lesson series. You output ONE valid JSON object matching an exact schema for a single lesson topic. Follow every rule below with NO exceptions - these come from many rounds of real feedback on real mistakes.

${guide}

${schema}

CRITICAL OUTPUT RULES:
- LANGUAGE: even though the rules above are written in Russian, every text value
  in your output JSON (story text, questions, notes, labels, everything) MUST be
  in ENGLISH. Never output Russian words or sentences in the JSON, with the one
  exception of the literal placeholder "[TEACHER NAME]" which stays as-is.
- Output ONLY a single valid JSON object. No markdown code fences, no commentary before or after.
- Fill in every field from the schema example. Do not leave placeholder text like "..." anywhere except "[TEACHER NAME]" which is intentional.
- "letter" must be the first letter of the topic word, uppercase.
- "intro_video_youtube_id" - you do NOT have web access, so set this to an empty string "". The app will warn the user to fill this in via web_search separately - do not invent a fake id.
- Re-read the "КРИТИЧНО" checklist rules before finalizing your answer and verify each one against your own output.
- FINAL CHECK before you answer: scan your own draft JSON one more time and confirm every single string value is in English, not Russian.`;
}

async function generateContent(topic) {
  if (!API_KEY) {
    throw new Error("OPENAI_API_KEY not found in .env");
  }
  const systemPrompt = buildSystemPrompt();
  const userPrompt = `Generate a complete content.json for the topic: "${topic}". Remember: the story must lead to building the topic itself (not a derivative object), each child builds their own model from scratch, no invented extra human characters, the challenge must be a construction task (never a physical test of the model), and the challenge archetype should suit this topic well. Write every text value in ENGLISH (not Russian).`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const raw = data.choices[0].message.content;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Model returned invalid JSON: ${e.message}\n\n${raw.slice(0, 500)}`);
  }
  return parsed;
}

// лёгкая версия проверок из qa-validate.py lint_content, чтобы поймать явный брак сразу
function lintContent(content) {
  const warnings = [];
  const qa = content.presentation_qa || [];
  if (qa.length < 4) warnings.push(`presentation_qa has only ${qa.length} question(s), need at least 4`);

  const props = content.story_props || [];
  if (props.length > 4) warnings.push(`story_props has ${props.length} items, keep it to max 3-4`);

  ["game1", "game2", "game3"].forEach((k) => {
    if (!content[k] || !content[k].script || !content[k].script.length) {
      warnings.push(`${k}.script is missing or empty`);
    }
  });

  const topic = (content.topic || "").toLowerCase();
  const summary = ((content.story || {}).short_summary || "").toLowerCase();
  if (topic && !summary.includes(topic)) {
    warnings.push(
      `story.short_summary does not mention the topic word "${content.topic}" - double-check the story leads to building the TOPIC model itself, not a derivative object`
    );
  }

  // на случай если модель всё же случайно вставила русский текст, несмотря на инструкцию
  const cyrillicFields = [];
  function scanForCyrillic(obj, pathStr) {
    if (typeof obj === "string") {
      if (/[а-яА-ЯёЁ]/.test(obj) && !/\[TEACHER NAME\]/.test(pathStr)) {
        cyrillicFields.push(pathStr);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((v, i) => scanForCyrillic(v, `${pathStr}[${i}]`));
    } else if (obj && typeof obj === "object") {
      Object.entries(obj).forEach(([k, v]) => scanForCyrillic(v, pathStr ? `${pathStr}.${k}` : k));
    }
  }
  scanForCyrillic(content, "");
  if (cyrillicFields.length) {
    warnings.push(
      `Found Russian text in these fields (should be English): ${cyrillicFields.join(", ")}. Edit content/${content.topic ? content.topic.toLowerCase().replace(/\s+/g, "_") : "?"}.json by hand to fix.`
    );
  }
  return warnings;
}

async function main() {
  const topic = process.argv[2];
  if (!topic) {
    console.error('Usage: node scripts/generate-content.js "Topic Word" [output_path]');
    process.exit(1);
  }
  const slug = topic.toLowerCase().replace(/\s+/g, "_");
  const outPath = process.argv[3] || path.join(ROOT, "content", `${slug}.json`);

  console.log(`Generating content.json for "${topic}" via ${MODEL}...`);
  const content = await generateContent(topic);

  const warnings = lintContent(content);
  if (warnings.length) {
    console.log("\n⚠ Lint found possible issues (you can fix them by hand in the JSON):");
    warnings.forEach((w) => console.log("  -", w));
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(content, null, 2), "utf8");
  console.log(`\nSaved: ${outPath}`);

  if (!content.intro_video_youtube_id) {
    console.log(
      '\n⚠ IMPORTANT: intro_video_youtube_id is empty (the model has no internet access). ' +
      'Find a suitable YouTube video yourself and put its id into content.json before building, ' +
      'otherwise slide 2 will have no video.'
    );
  }
}

main().catch((e) => {
  console.error("\nError:", e.message);
  process.exit(1);
});
