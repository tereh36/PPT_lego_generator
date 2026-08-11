#!/usr/bin/env node
/**
 * verify-packaged-deps.js - runs automatically at the end of `npm run build`.
 *
 * Safety net for the electron-builder dependency-tree problem described in
 * tools/after-pack.js: a missing module inside the installer only surfaces
 * when the end user runs that specific feature, long after release (that is
 * how the broken printable PDF shipped in 1.6.12). This replays Node's own
 * resolution algorithm over the packed app and fails the build instead.
 */
const fs = require("fs");
const path = require("path");
const { findUnresolvedDeps } = require("./packaged-deps");

const APP_DIR = path.resolve(__dirname, "..", "dist", "win-unpacked", "resources", "app");

function main() {
  if (!fs.existsSync(APP_DIR)) {
    console.error(`verify-packaged-deps: ${APP_DIR} not found - did the build run?`);
    process.exit(1);
  }

  const problems = findUnresolvedDeps(APP_DIR);
  if (problems.length) {
    console.error("\nverify-packaged-deps: BUILD IS BROKEN - unresolvable modules in the packaged app:\n");
    console.error([...new Set(problems.map((p) => `  ${p.dep}  <- required by ${p.requiredBy}`))].join("\n"));
    console.error(
      "\nThe after-pack hook (tools/after-pack.js) should have hoisted these\n" +
      "automatically - check that it is still wired up as build.afterPack in\n" +
      "package.json, and that the package exists in the project's node_modules\n" +
      "(run npm install).\n"
    );
    process.exit(1);
  }

  console.log("verify-packaged-deps: OK - every dependency in the packaged app resolves.");
}

main();
