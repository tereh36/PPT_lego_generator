/**
 * Shared helper: replay Node's module resolution over a packed app folder and
 * report every dependency that could NOT be resolved from where it is needed.
 *
 * Used by after-pack.js (to repair the tree) and verify-packaged-deps.js (to
 * fail the build if anything is still broken afterwards).
 */
const fs = require("fs");
const path = require("path");

// Type-only packages: listed in "dependencies" by their authors but never
// require()d at runtime, so a missing one is harmless. Keep this list tiny
// and justified - it is a whitelist of known-safe absences, not a dumping
// ground for "it seemed to work anyway".
const TYPES_ONLY = new Set(["@types/node", "undici-types"]);

function readPkg(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    return null;
  }
}

// Node resolution: look in <dir>/node_modules, then walk up parent folders.
// Bounded by appDir so we never accidentally resolve against the developer
// machine's own node_modules outside the packaged app.
function canResolve(name, fromDir, appDir) {
  let dir = fromDir;
  while (dir.startsWith(appDir)) {
    if (fs.existsSync(path.join(dir, "node_modules", name, "package.json"))) return true;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

function eachPackageDir(nodeModulesDir, visit) {
  if (!fs.existsSync(nodeModulesDir)) return;
  for (const entry of fs.readdirSync(nodeModulesDir)) {
    if (entry.startsWith(".")) continue;
    const entryPath = path.join(nodeModulesDir, entry);
    if (!fs.statSync(entryPath).isDirectory()) continue;
    if (entry.startsWith("@")) {
      for (const scoped of fs.readdirSync(entryPath)) visit(path.join(entryPath, scoped));
    } else {
      visit(entryPath);
    }
  }
}

/** @returns {Array<{dep: string, requiredBy: string}>} */
function findUnresolvedDeps(appDir) {
  const appRoot = path.resolve(appDir);
  const problems = [];

  function checkPackage(dir) {
    const pkg = readPkg(dir);
    if (!pkg) return;
    for (const dep of Object.keys(pkg.dependencies || {})) {
      if (TYPES_ONLY.has(dep)) continue;
      if (!canResolve(dep, dir, appRoot)) {
        problems.push({ dep, requiredBy: path.relative(appRoot, dir) || "(app root)" });
      }
    }
  }

  function scan(dir) {
    eachPackageDir(path.join(dir, "node_modules"), (pkgDir) => {
      checkPackage(pkgDir);
      scan(pkgDir);
    });
  }

  checkPackage(appRoot);
  scan(appRoot);
  return problems;
}

module.exports = { findUnresolvedDeps };
