#!/usr/bin/env node
/**
 * generate-images-remote.js content/<topic>.json
 *
 * Calls the Brick4Kidz backend for images. Images are covered by the same
 * flat per-lesson charge already deducted during content generation.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

async function main() {
  const contentPath = process.argv[2];
  if (!contentPath) {
    console.error("Usage: node scripts/generate-images-remote.js content/<topic>.json");
    process.exit(1);
  }
  const { BRICK_USERNAME, BRICK_PASSWORD, BRICK_BACKEND_URL } = process.env;
  if (!BRICK_USERNAME || !BRICK_PASSWORD || !BRICK_BACKEND_URL) {
    throw new Error("Missing account username/password or backend URL. Set them in Settings.");
  }

  const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  const slug = content.topic.toLowerCase().replace(/\s+/g, "_");

  console.log("Generating images via the Brick4Kidz backend...");
  const res = await fetch(BRICK_BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "generate_images", username: BRICK_USERNAME, password: BRICK_PASSWORD, content })
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "Unknown backend error");
  }

  const outDir = path.join(ROOT, "assets", "generated", slug);
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
