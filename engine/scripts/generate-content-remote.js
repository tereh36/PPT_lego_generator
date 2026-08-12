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
  const { BRICK_USERNAME, BRICK_PASSWORD, BRICK_BACKEND_URL, BRICK_DATA_DIR, BRICK_TRACK, BRICK_NOTES } = process.env;
  if (!BRICK_USERNAME || !BRICK_PASSWORD || !BRICK_BACKEND_URL) {
    throw new Error("Missing account username/password or backend URL. Set them in Settings.");
  }
  const dataDir = BRICK_DATA_DIR || path.resolve(__dirname, "..");

  console.log(`Generating content.json for "${topic}" via the Brick4Kidz backend...`);

  // Apps Script's own execution limit is ~6 minutes for a single run - if the
  // guide/schema grew and pushed total time (2 UrlFetchApp calls + the Claude
  // API call) past that, Google kills the script and returns its OWN html
  // error page instead of our JSON. Give it a generous but bounded client
  // timeout (5.5 min) so we fail with a clear message instead of hanging
  // indefinitely, and - separately - always show what the backend actually
  // sent back when it's not valid JSON, instead of guessing at the cause.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5.5 * 60 * 1000);

  let res;
  try {
    res = await fetch(BRICK_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_content",
        username: BRICK_USERNAME,
        password: BRICK_PASSWORD,
        topic,
        track: BRICK_TRACK || "preschool",
        notes: BRICK_NOTES || ""
      }),
      signal: controller.signal
    });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(
        "The request to the backend was still running after 5.5 minutes and was cancelled. " +
        "This usually means Google Apps Script hit its own ~6 minute execution limit while " +
        "Claude was generating a large response - try again, and if it keeps happening, the " +
        "content guide/schema may need trimming down."
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await (async () => {
    const rawText = await res.text();
    try {
      return JSON.parse(rawText);
    } catch (e) {
      // Show what actually came back (truncated) instead of guessing - this
      // is either Google's own execution-timeout HTML page, an auth/deploy
      // error page, or something else entirely, and each needs a different
      // fix, so hiding the real text made this impossible to diagnose.
      const snippet = rawText.slice(0, 300).replace(/\s+/g, " ").trim();
      throw new Error(
        `The backend returned a non-JSON response (HTTP ${res.status}). ` +
        `This is often Google Apps Script's own ~6 minute execution limit being hit. ` +
        `Raw response start: "${snippet}"`
      );
    }
  })();
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
