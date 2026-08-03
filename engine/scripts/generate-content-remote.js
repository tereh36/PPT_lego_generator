#!/usr/bin/env node
/**
 * generate-content-remote.js "Topic Word"
 *
 * Calls the Brick4Kidz backend (Google Apps Script) instead of using a local
 * API key. Needs BRICK_USERNAME, BRICK_PASSWORD, BRICK_BACKEND_URL, and
 * BRICK_DATA_DIR in the environment (the Electron app sets these).
 *
 * BRICK_DATA_DIR must be a WRITABLE folder (e.g. inside the OS's per-user
 * app-data directory) — never write generated files into the app's own
 * install folder, Windows blocks that without admin rights.
 */
const fs = require("fs");
const path = require("path");

async function main() {
  const topic = process.argv[2];
  if (!topic) {
    console.error('Usage: node scripts/generate-content-remote.js "Topic Word"');
    process.exit(1);
  }
  const { BRICK_USERNAME, BRICK_PASSWORD, BRICK_BACKEND_URL, BRICK_DATA_DIR, BRICK_TRACK } = process.env;
  if (!BRICK_USERNAME || !BRICK_PASSWORD || !BRICK_BACKEND_URL) {
    throw new Error("Missing account username/password or backend URL. Set them in Settings.");
  }
  const dataDir = BRICK_DATA_DIR || path.resolve(__dirname, "..");

  console.log(`Generating content.json for "${topic}" via the Brick4Kidz backend...`);
  const res = await fetch(BRICK_BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "generate_content",
      username: BRICK_USERNAME,
      password: BRICK_PASSWORD,
      topic,
      track: BRICK_TRACK || "preschool"
    })
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "Unknown backend error");
  }

  const slug = topic.toLowerCase().replace(/\s+/g, "_");
  const outPath = path.join(dataDir, "content", `${slug}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data.content, null, 2), "utf8");
  console.log(`Saved: ${outPath}`);
  console.log(`Balance remaining: $${data.balance}`);

  if (!data.content.intro_video_youtube_id) {
    console.log(
      "\n⚠ IMPORTANT: intro_video_youtube_id is empty (the backend has no way to verify a " +
      "video). Find a suitable YouTube video yourself and put its id into content.json before building."
    );
  }
}

main().catch((e) => {
  console.error("\nError:", e.message);
  process.exit(1);
});
