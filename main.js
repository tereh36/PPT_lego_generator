const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { autoUpdater } = require("electron-updater");

app.setName("Brick4Kidz");

const ENGINE_DIR = path.join(__dirname, "engine");
const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");
const OUTPUT_ROOT = path.join(app.getPath("documents"), "Brick4Kidz");

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

function sendUpdateStatus(text) {
  if (mainWindow) mainWindow.webContents.send("update:status", text);
}
autoUpdater.on("checking-for-update", () => sendUpdateStatus("Checking for updates..."));
autoUpdater.on("update-available", (info) => {
  manualUpdateCheck = false;
  sendUpdateStatus(`Update ${info.version} found, downloading...`);
});
autoUpdater.on("update-not-available", () => {
  if (manualUpdateCheck) {
    sendUpdateStatus("You're on the latest version.");
    manualUpdateCheck = false;
    setTimeout(() => sendUpdateStatus(""), 4000);
  } else {
    sendUpdateStatus("");
  }
});
autoUpdater.on("error", () => {
  manualUpdateCheck = false;
  sendUpdateStatus("");
});
autoUpdater.on("download-progress", (p) => sendUpdateStatus(`Downloading update: ${Math.round(p.percent)}%`));
autoUpdater.on("update-downloaded", () => sendUpdateStatus("READY:Update downloaded! Click here to restart and install."));

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

// ---------- IPC: balance check ----------
ipcMain.handle("account:checkBalance", async () => {
  const cfg = loadConfig();
  if (!cfg.username || !cfg.password) return { ok: false, error: "No account set" };
  try {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check_balance", username: cfg.username, password: cfg.password }),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle("account:getPrices", async () => {
  const cfg = loadConfig();
  if (!cfg.username || !cfg.password) return { ok: false, error: "No account set" };
  try {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_prices", username: cfg.username, password: cfg.password }),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

// ---------- IPC: open the folder with finished files ----------
ipcMain.handle("files:openOutputFolder", () => {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  shell.openPath(OUTPUT_ROOT);
});

// ---------- run pipeline steps as child processes ----------
function runStep(cmd, args, extraEnv) {
  return new Promise((resolve) => {
    let output = "";
    const proc = spawn(cmd, args, {
      cwd: ENGINE_DIR,
      shell: true,
      env: { ...process.env, ...extraEnv },
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

ipcMain.handle("lesson:create", async (event, { topic, track }) => {
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
    send("No account set. Open Settings (gear icon) and log in.");
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
  };

  function reportFailure(label, output) {
    send(`⚠️  ${label} ran into a problem:`);
    const tail = output.trim().split("\n").slice(-12).join("\n");
    send(tail || "(no output)");
  }

  if (!fs.existsSync(contentPath)) {
    send("✍️  Writer is crafting the story, games, and challenge...");
    const r = await runStep("node", ["scripts/generate-content-remote.js", topic], extraEnv);
    if (!r.ok || !fs.existsSync(contentPath)) {
      reportFailure("Writer", r.output);
      send("Check your account balance, then try again.");
      return { ok: false };
    }
    const balanceMatch = r.output.match(/Balance remaining: \$(-?\d+(\.\d+)?)/);
    if (balanceMatch) {
      send(`💰 Balance remaining: $${balanceMatch[1]}`);
      event.sender.send("account:balanceUpdated", Number(balanceMatch[1]));
    }
  } else {
    send(`📄 Reusing existing content for "${topic}".`);
  }

  if (cfg.withImages) {
    send("🎨 Illustrator is painting the pictures...");
    const r = await runStep("node", ["scripts/generate-images-remote.js", contentPath], extraEnv);
    if (!r.ok) reportFailure("Illustrator", r.output);
  } else {
    send("🎨 Skipping images - slides will show prompt text instead.");
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
  const qa = await runStep("python", ["scripts/qa-validate.py", pptxSrc, contentPath], extraEnv);
  if (!qa.ok) reportFailure("Inspector", qa.output);

  send("🖨️  Printer is preparing the handout PDF...");
  const pdf = await runStep("python", ["scripts/build-print-pdf.py", contentPath], extraEnv);
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
    send(`✅ Done! Files saved to:\n${finalDir}`);
    shell.openPath(finalDir);
    return { ok: true, outputDir: finalDir };
  }
  send("⚠️  Something went wrong, no output files were found.");
  return { ok: false };
});
