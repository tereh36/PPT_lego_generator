/**
 * after-pack.js - electron-builder hook, runs after the app folder is packed
 * but BEFORE the NSIS installer is assembled, so repairs here end up inside
 * the shipped installer.
 *
 * WHY THIS EXISTS
 * ---------------
 * electron-builder does not copy node_modules verbatim - it rebuilds the
 * dependency tree itself, and v25 can place a SHARED package inside one
 * dependent's own node_modules instead of hoisting it to the top level.
 * Every other package that needs it then fails at runtime with
 * "Cannot find module ...", even though the package IS inside the installer.
 *
 * That is exactly what broke the printable PDF in 1.6.12:
 * call-bind-apply-helpers landed in node_modules/call-bind/node_modules/, so
 * get-intrinsic (top level) could not resolve it -> pdfkit failed to load ->
 * the Printer step died. The PPTX still built fine because pptxgenjs does not
 * go through that dependency chain, which is why the failure looked like
 * "the presentation is fine but there is no PDF".
 *
 * Declaring the package as a direct dependency in package.json does NOT fix
 * it - electron-builder nests it under the same dependent regardless. So we
 * repair the packed tree here: copy any unresolvable package from the
 * project's own node_modules up to the app's top-level node_modules, which is
 * visible to everything.
 */
const fs = require("fs");
const path = require("path");
const { findUnresolvedDeps } = require("./packaged-deps");

const PROJECT_ROOT = path.resolve(__dirname, "..");

exports.default = async function afterPack(context) {
  const appDir = path.join(context.appOutDir, "resources", "app");
  if (!fs.existsSync(appDir)) {
    // asar enabled or a layout we don't know - nothing safe to do here.
    console.log("  • after-pack: no unpacked resources/app folder, skipping dependency hoist");
    return;
  }

  // Repairing one package can reveal the next one (a hoisted package brings
  // its own dependencies into scope), so repeat until the tree stops changing.
  const hoisted = [];
  for (let pass = 0; pass < 10; pass++) {
    const missing = [...new Set(findUnresolvedDeps(appDir).map((p) => p.dep))];
    if (!missing.length) break;

    let progressed = false;
    for (const dep of missing) {
      const src = path.join(PROJECT_ROOT, "node_modules", dep);
      const dest = path.join(appDir, "node_modules", dep);
      if (!fs.existsSync(path.join(src, "package.json"))) {
        console.warn(`  ⚠ after-pack: "${dep}" is missing from the packed app and not in the project's node_modules either`);
        continue;
      }
      if (fs.existsSync(dest)) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(src, dest, { recursive: true });
      hoisted.push(dep);
      progressed = true;
    }
    if (!progressed) break;
  }

  if (hoisted.length) {
    console.log(`  • after-pack: hoisted ${hoisted.length} package(s) to the app's top-level node_modules: ${hoisted.join(", ")}`);
  } else {
    console.log("  • after-pack: dependency tree is already complete, nothing to hoist");
  }
};
