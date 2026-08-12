#!/usr/bin/env node
/**
 * generate-images-remote.js <absolute path to content.json>
 *
 * Calls the Brick4Kidz backend for images. Writes into BRICK_DATA_DIR
 * (writable), never into the app's own install folder.
 */
const fs = require("fs");
const path = require("path");

async function main() {
  const contentPath = process.argv[2];
  if (!contentPath) {
    console.error("Usage: node scripts/generate-images-remote.js <path to content.json>");
    process.exit(1);
  }
  const { BRICK_USERNAME, BRICK_PASSWORD, BRICK_BACKEND_URL, BRICK_DATA_DIR, BRICK_IMAGES_TIMEOUT_MS } = process.env;
  if (!BRICK_USERNAME || !BRICK_PASSWORD || !BRICK_BACKEND_URL) {
    throw new Error("Missing account username/password or backend URL. Set them in Settings.");
  }
  const dataDir = BRICK_DATA_DIR || path.resolve(__dirname, "..");

  const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  const slug = content.topic.toLowerCase().replace(/\s+/g, "_");

  // See generate-content-remote.js for why this is generous and overridable.
  const timeoutMs = Number(BRICK_IMAGES_TIMEOUT_MS) || 9 * 60 * 1000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  console.log("Generating images via the Brick4Kidz backend...");
  let res;
  try {
    res = await fetch(BRICK_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_images", username: BRICK_USERNAME, password: BRICK_PASSWORD, content }),
      signal: controller.signal
    });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(
        `Gave up waiting for the backend after ${Math.round(timeoutMs / 1000)}s generating images. If it ` +
        "genuinely needs longer, raise BRICK_IMAGES_TIMEOUT_MS (milliseconds) and try again."
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  const rawText = await res.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    const snippet = rawText.trim().slice(0, 500) || "(empty response)";
    throw new Error(
      `Backend returned HTTP ${res.status} with a non-JSON response while generating images, so it ` +
      `likely errored out server-side rather than timing out. Raw response:\n${snippet}`
    );
  }
  if (!data.ok) {
    throw new Error(data.error || "Unknown backend error");
  }

  const outDir = path.join(dataDir, "assets", "generated", slug);
  fs.mkdirSync(outDir, { recursive: true });

  Object.entries(data.images).forEach(([key, b64]) => {
    const fname = key.startsWith("prop_") ? `${key.slice(5)}.png` : `${key}.png`;
    fs.writeFileSync(path.join(outDir, fname), Buffer.from(b64, "base64"));
    console.log(`Saved: ${fname}`);
  });
}

main().catch((e) => {
  console.error("\nError:", e.message);
  process.exit(1);
});
