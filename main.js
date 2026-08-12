const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { autoUpdater } = require("electron-updater");

app.setName("Star Team");

const ENGINE_DIR = path.join(__dirname, "engine");
const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");
const OUTPUT_ROOT = path.join(app.getPath("documents"), "Star Team");

// Everything the engine GENERATES (content.json, downloaded images, built
// pptx/pdf) must live in a WRITABLE folder outside the app's own install
// directory — Windows blocks writing into an installed app's resources
// folder without admin rights. Static/read-only assets (letter patterns,
// free_play.png, the scripts themselves) stay inside ENGINE_DIR as before.
const DATA_DIR = path.join(app.getPath("userData"), "engine-data");

// This is not a secret — it just points at the (password-protected) backend.
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbylvbSBXtjWZe9rzHUxOSjZVBqxAqDKaOofNKjYuQTYNaZ4F9iKK0IESloU8Juyei2N/exec";

function ensureDataDirs() {
  fs.mkdirSync(path.join(DATA_DIR, "content"), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "assets", "generated"), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "output"), { recursive: true });
}

// ---------- settings (login, password, image mode) ----------
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return { username: "", password: "", withImages: true };
  }
}
function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
}

let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 760,
    minWidth: 720,
    minHeight: 600,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  ensureDataDirs();
  createWindow();
  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---------- auto-update ----------
let manualUpdateCheck = false;

function sendUpdateStatus(text, percent) {
  if (mainWindow) mainWindow.webContents.send("update:status", { text, percent: typeof percent === "number" ? percent : null });
}
autoUpdater.on("checking-for-update", () => {
  console.log("[autoUpdater] checking-for-update");
  sendUpdateStatus("Checking for updates...");
});
autoUpdater.on("update-available", (info) => {
  console.log("[autoUpdater] update-available:", info && info.version);
  manualUpdateCheck = false;
  sendUpdateStatus(`Update ${info.version} found, downloading...`, 0);
});
autoUpdater.on("update-not-available", () => {
  console.log("[autoUpdater] update-not-available");
  if (manualUpdateCheck) {
    sendUpdateStatus("You're on the latest version.");
    manualUpdateCheck = false;
    setTimeout(() => sendUpdateStatus(""), 4000);
  } else {
    sendUpdateStatus("");
  }
});
autoUpdater.on("error", (err) => {
  console.error("[autoUpdater] error:", err);
  manualUpdateCheck = false;
  const reason = err && err.message ? err.message : "Unknown error";
  sendUpdateStatus(`Update failed: ${reason}`);
  setTimeout(() => sendUpdateStatus(""), 8000);
});
autoUpdater.on("download-progress", (p) => {
  console.log(`[autoUpdater] download-progress: ${Math.round(p.percent)}% (${p.transferred}/${p.total} bytes)`);
  sendUpdateStatus(`Downloading update: ${Math.round(p.percent)}%`, p.percent);
});
autoUpdater.on("update-downloaded", () => {
  console.log("[autoUpdater] update-downloaded");
  sendUpdateStatus("READY:Update downloaded! Click here to restart and install.", 100);
});

ipcMain.handle("update:installNow", () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle("update:checkNow", () => {
  manualUpdateCheck = true;
  autoUpdater.checkForUpdates().catch(() => {
    manualUpdateCheck = false;
    sendUpdateStatus("Could not check for updates (no internet?).");
    setTimeout(() => sendUpdateStatus(""), 4000);
  });
});

ipcMain.handle("app:getVersion", () => app.getVersion());

// ---------- IPC: settings (login/password/images) ----------
ipcMain.handle("config:get", () => loadConfig());

ipcMain.handle("config:setAccount", (e, { username, password }) => {
  const cfg = loadConfig();
  cfg.username = (username || "").trim();
  cfg.password = (password || "").trim();
  saveConfig(cfg);
  return true;
});

ipcMain.handle("config:deleteAccount", () => {
  const cfg = loadConfig();
  cfg.username = "";
  cfg.password = "";
  saveConfig(cfg);
  return true;
});

ipcMain.handle("config:setImageMode", (e, withImages) => {
  const cfg = loadConfig();
  cfg.withImages = !!withImages;
  saveConfig(cfg);
  return true;
});

// Calls the Apps Script backend and retries a couple times if it comes back
// with a non-JSON response - Google Apps Script's own hosting occasionally
// serves a generic error/quota page instead of actually running the script,
// a known if annoying reliability quirk unrelated to our code. A real
// backend error (bad password, not enough balance) comes back as valid
// JSON with ok:false and is NOT retried, since retrying won't fix that.
async function callBackendWithRetry(action, extraBody, maxAttempts = 3) {
  const cfg = loadConfig();
  if (!cfg.username || !cfg.password) return { ok: false, error: "No account set" };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, username: cfg.username, password: cfg.password, ...extraBody }),
      });
      const rawText = await res.text();
      try {
        return JSON.parse(rawText);
      } catch {
        const snippet = rawText.slice(0, 300).replace(/\s+/g, " ").trim();
        const err = new Error(`Backend returned a non-JSON response (HTTP ${res.status}): "${snippet}"`);
        err.isNonJson = true;
        throw err;
      }
    } catch (err) {
      const isLastAttempt = attempt === maxAttempts;
      if (!err.isNonJson || isLastAttempt) {
        const suffix = err.isNonJson ? ` (gave up after ${maxAttempts} attempts)` : "";
        return { ok: false, error: String(err.message || err) + suffix };
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

// ---------- IPC: balance check ----------
ipcMain.handle("account:checkBalance", () => callBackendWithRetry("check_balance"));

ipcMain.handle("account:getPrices", () => callBackendWithRetry("get_prices"));

// ---------- IPC: open the folder with finished files ----------
ipcMain.handle("files:openOutputFolder", () => {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  shell.openPath(OUTPUT_ROOT);
});

// ---------- run pipeline steps as child processes ----------
function runStep(cmd, args, extraEnv) {
  return new Promise((resolve) => {
    let output = "";
    // With shell:true on Windows, args are joined into one command line for
    // cmd.exe - any arg containing a space (like a path under "Star Team")
    // gets silently split into two args unless quoted. This was the cause
    // of "no such file" errors after renaming folders that contain a space.
    const safeArgs = args.map((a) => (typeof a === "string" && a.includes(" ") && !a.startsWith('"') ? `"${a}"` : a));

    // For Node scripts, run them through Electron's OWN bundled Node runtime
    // instead of a system-wide "node" install. This app gets installed on
    // machines that may not have Node.js at all (e.g. a non-technical
    // teacher's PC) - spawning the literal "node" command then fails with
    // "'node' is not recognized as an internal or external command".
    // process.execPath (the Electron binary itself) + ELECTRON_RUN_AS_NODE
    // makes Electron behave like a plain Node executable, so this always
    // works regardless of what is or isn't installed on the target machine.
    const isNode = cmd === "node";
    const realCmd = isNode ? process.execPath : cmd;
    const realEnv = { ...process.env, ...extraEnv };
    if (isNode) realEnv.ELECTRON_RUN_AS_NODE = "1";

    // Same quoting problem as args (see above), but for the command itself:
    // process.execPath is the full path to the installed app's own binary,
    // e.g. "D:\StarTeam\Star Team.exe" - productName ("Star Team") contains
    // a space, so without quoting, cmd.exe under shell:true reads only up
    // to the space as the command ("D:\StarTeam\Star") and chokes on the
    // rest, producing "'...\Star' is not recognized...".
    const safeCmd = realCmd.includes(" ") && !realCmd.startsWith('"') ? `"${realCmd}"` : realCmd;

    const proc = spawn(safeCmd, safeArgs, {
      cwd: ENGINE_DIR,
      shell: true,
      env: realEnv,
    });
    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => (output += d.toString()));
    proc.on("error", (err) => {
      output += `\nFailed to run "${cmd}": ${err.message}\n`;
      resolve({ ok: false, output });
    });
    proc.on("close", (code) => resolve({ ok: code === 0, output }));
  });
}

ipcMain.handle("lesson:checkExists", (event, { topic }) => {
  const slug = (topic || "").trim().toLowerCase().replace(/\s+/g, "_");
  const contentPath = path.join(DATA_DIR, "content", `${slug}.json`);
  return fs.existsSync(contentPath);
});

ipcMain.handle("lesson:create", async (event, { topic, track, notes, regenerate }) => {
  const send = (msg) => event.sender.send("lesson:log", msg + "\n");
  const cfg = loadConfig();

  if (track === "brickmoto") {
    send("🚧 Brickmoto is still in development.");
    return { ok: false };
  }
  if (!topic || !topic.trim()) {
    send("Enter a lesson topic first.");
    return { ok: false };
  }
  if (!cfg.username || !cfg.password) {
    send("No account set. Please log in again.");
    return { ok: false, needsAccount: true };
  }

  ensureDataDirs();

  const slug = topic.trim().toLowerCase().replace(/\s+/g, "_");
  const contentPath = path.join(DATA_DIR, "content", `${slug}.json`);
  const extraEnv = {
    BRICK_USERNAME: cfg.username,
    BRICK_PASSWORD: cfg.password,
    BRICK_BACKEND_URL: BACKEND_URL,
    BRICK_DATA_DIR: DATA_DIR,
    BRICK_TRACK: track,
    BRICK_NOTES: notes || "",
  };

  function reportFailure(label, output) {
    send(`⚠️  ${label} ran into a problem:`);
    const tail = output.trim().split("\n").slice(-12).join("\n");
    send(tail || "(no output)");
  }

  const forceRegenerate = !!(notes && notes.trim()) || !!regenerate;
  if (!fs.existsSync(contentPath) || forceRegenerate) {
    send("✍️  Writer is crafting the story, games, and challenge...");
    const r = await runStep("node", ["scripts/generate-content-remote.js", topic], extraEnv);
    if (!r.ok || !fs.existsSync(contentPath)) {
      reportFailure("Writer", r.output);
      if (/not enough balance/i.test(r.output)) {
        send("Check your account balance, then try again.");
      }
      return { ok: false };
    }
    const balanceMatch = r.output.match(/Balance remaining: \$(-?\d+(\.\d+)?)/);
    if (balanceMatch) {
      send(`💰 Balance remaining: $${balanceMatch[1]}`);
      event.sender.send("account:balanceUpdated", Number(balanceMatch[1]));
    }
  } else {
    send(`📄 Rebuilding "${topic}" from existing materials.`);
  }

  send("🎨 Illustrator is painting the pictures...");
  {
    const r = await runStep("node", ["scripts/generate-images-remote.js", contentPath], extraEnv);
    if (!r.ok) reportFailure("Illustrator", r.output);
  }

  send("🧱 Builder is assembling the slides...");
  const built = await runStep("node", ["scripts/build-pptx.js", contentPath], extraEnv);
  if (!built.ok) {
    reportFailure("Builder", built.output);
    return { ok: false };
  }

  const pptxSrc = path.join(DATA_DIR, "output", `${slug}.pptx`);
  const pdfSrc = path.join(DATA_DIR, "output", `${slug}_printables.pdf`);

  send("🔍 Inspector is checking everything...");
  const qa = await runStep("node", ["scripts/qa-validate.js", pptxSrc, contentPath], extraEnv);
  if (!qa.ok) reportFailure("Inspector", qa.output);

  send("🖨️  Printer is preparing the handout PDF...");
  const pdf = await runStep("node", ["scripts/build-print-pdf.js", contentPath], extraEnv);
  if (!pdf.ok) reportFailure("Printer", pdf.output);

  const finalDir = path.join(OUTPUT_ROOT, slug);
  fs.mkdirSync(finalDir, { recursive: true });
  let copiedAny = false;
  if (fs.existsSync(pptxSrc)) {
    fs.copyFileSync(pptxSrc, path.join(finalDir, `${slug}.pptx`));
    copiedAny = true;
  }
  if (fs.existsSync(pdfSrc)) {
    fs.copyFileSync(pdfSrc, path.join(finalDir, `${slug}_printables.pdf`));
    copiedAny = true;
  }

  if (copiedAny) {
    if (!qa.ok) {
      send(`⚠️  DELIVERED WITH QA ISSUES - please review before using with children!\nFiles saved to:\n${finalDir}`);
    } else {
      send(`✅ Done! QA passed. Files saved to:\n${finalDir}`);
    }
    shell.openPath(finalDir);
    return { ok: true, outputDir: finalDir, qaPassed: qa.ok };
  }
  send("⚠️  Something went wrong, no output files were found.");
  return { ok: false };
});
