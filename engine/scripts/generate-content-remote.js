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
  // timeout (5.5 min) per attempt.
  const TIMEOUT_MS = 5.5 * 60 * 1000;
  const MAX_ATTEMPTS = 3;

  async function attemptOnce() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
          "Claude was generating a large response."
        );
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }

    const rawText = await res.text();
    try {
      return JSON.parse(rawText);
    } catch (e) {
      // Show what actually came back (truncated) instead of guessing - this
      // is usually Google Apps Script's own hosting hiccuping and serving a
      // generic error/quota page instead of running our script at all (a
      // known, if annoying, occasional reliability quirk of Apps Script web
      // apps, unrelated to our code) - retried a few times below before
      // giving up.
      const snippet = rawText.slice(0, 300).replace(/\s+/g, " ").trim();
      const err = new Error(
        `The backend returned a non-JSON response (HTTP ${res.status}). ` +
        `Raw response start: "${snippet}"`
      );
      err.isNonJson = true;
      throw err;
    }
  }

  let data;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      data = await attemptOnce();
      break;
    } catch (e) {
      const isLastAttempt = attempt === MAX_ATTEMPTS;
      // Only retry the "Google served a weird non-JSON page" case - a real
      // backend error (bad balance, wrong password, etc.) comes back as
      // valid JSON with ok:false and retrying won't change that, so those
      // fail immediately instead of wasting time on 3 identical attempts.
      if (!e.isNonJson || isLastAttempt) {
        if (e.isNonJson) {
          throw new Error(e.message + ` (gave up after ${MAX_ATTEMPTS} attempts)`);
        }
        throw e;
      }
      console.log(`Attempt ${attempt} got a bad response from the backend, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
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
