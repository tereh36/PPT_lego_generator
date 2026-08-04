// ---------- brand name (colored per-letter "Star Team") ----------
function renderBrandName(el) {
  if (!el) return;
  el.innerHTML = "Star Team".split("").map((ch) => `<span class="brand-letter">${ch}</span>`).join("");
}
["brandName", "brandName2", "brandName3", "brandNameLoading"].forEach((id) => renderBrandName(document.getElementById(id)));

// ---------- screen navigation ----------
const screens = {
  loading: document.getElementById("screen-loading"),
  loginUsername: document.getElementById("screen-login-username"),
  loginPassword: document.getElementById("screen-login-password"),
  bridge: document.getElementById("screen-bridge"),
  create: document.getElementById("screen-create"),
};
function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

// ---------- constellation rendering (merged into the Bridge) ----------
function seededRandom(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000; // 0..1
}

function buildConstellation(container, opts) {
  const showLabels = !!opts.showLabels;
  const scale = opts.scale || 1;
  const w = container.clientWidth || 700;
  const h = container.clientHeight || 400;
  const hub = STAR_TEAM.find((s) => s.isHub);
  const others = STAR_TEAM.filter((s) => !s.isHub);

  const hubX = w / 2, hubY = h / 2;
  const baseRadiusX = w * 0.38, baseRadiusY = h * 0.38;
  const positions = { [hub.id]: { x: hubX, y: hubY } };
  others.forEach((star, i) => {
    const angleJitter = (seededRandom(star.id + "a") - 0.5) * 0.6; // +-0.3 rad
    const radiusJitter = 0.7 + seededRandom(star.id + "r") * 0.55; // irregular like a real sky
    const angle = (i / others.length) * Math.PI * 2 - Math.PI / 2 + angleJitter;
    positions[star.id] = {
      x: hubX + Math.cos(angle) * baseRadiusX * radiusJitter,
      y: hubY + Math.sin(angle) * baseRadiusY * radiusJitter
    };
  });

  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%"><defs>`;
  STAR_TEAM.forEach((star) => {
    svg += `<radialGradient id="grad-${star.id}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" /><stop offset="35%" stop-color="${star.color}" />
      <stop offset="100%" stop-color="${star.color}" stop-opacity="0" /></radialGradient>`;
  });
  svg += `</defs>`;
  // thin horoscope-style lines from hub to every other star - these pulse
  // during generation to show the signal traveling to whichever star is working
  others.forEach((star) => {
    const p = positions[star.id];
    svg += `<line class="star-line" data-star-id="${star.id}" x1="${hubX}" y1="${hubY}" x2="${p.x}" y2="${p.y}" stroke="${star.color}" stroke-opacity="0.4" stroke-width="${1.1 * scale}" />`;
  });
  // star-flare nodes - soft layered glow + thin diffraction spikes, like a real star photo
  STAR_TEAM.forEach((star) => {
    const p = positions[star.id];
    const s = (star.isHub ? 46 : 34) * scale;
    svg += `<g class="star-node" data-star-id="${star.id}" style="cursor:pointer">`;
    svg += `<circle class="star-glow star-glow-outer" cx="${p.x}" cy="${p.y}" r="${s * 0.68}" fill="url(#grad-${star.id})" opacity="0.35" />`;
    svg += `<circle class="star-glow" cx="${p.x}" cy="${p.y}" r="${s * 0.42}" fill="url(#grad-${star.id})" opacity="0.7" />`;
    svg += `<g class="star-spikes" style="transform-box: fill-box; transform-origin: center;" stroke="${star.color}" stroke-linecap="round">
      <line x1="${p.x}" y1="${p.y - s * 0.55}" x2="${p.x}" y2="${p.y + s * 0.55}" stroke-width="${Math.max(0.5, s * 0.016)}" opacity="0.8" />
      <line x1="${p.x - s * 0.55}" y1="${p.y}" x2="${p.x + s * 0.55}" y2="${p.y}" stroke-width="${Math.max(0.5, s * 0.016)}" opacity="0.8" />
      <line x1="${p.x - s * 0.26}" y1="${p.y - s * 0.26}" x2="${p.x + s * 0.26}" y2="${p.y + s * 0.26}" stroke-width="${Math.max(0.4, s * 0.008)}" opacity="0.45" />
      <line x1="${p.x - s * 0.26}" y1="${p.y + s * 0.26}" x2="${p.x + s * 0.26}" y2="${p.y - s * 0.26}" stroke-width="${Math.max(0.4, s * 0.008)}" opacity="0.45" />
    </g>`;
    svg += `<circle class="star-core" cx="${p.x}" cy="${p.y}" r="${Math.max(1.2, s * 0.08)}" fill="#ffffff" style="transform-box: fill-box; transform-origin: center;" />`;
    svg += `<circle cx="${p.x}" cy="${p.y}" r="${s * 0.7}" fill="transparent" />`; // easy hover/click target
    if (showLabels) {
      svg += `<text x="${p.x}" y="${p.y + s * 0.5 + 16}" text-anchor="middle" font-size="12" fill="#EAF2FF" font-family="Segoe UI, Arial">${star.name}</text>`;
    }
    svg += `</g>`;
  });
  svg += `</svg>`;
  container.innerHTML = svg;
  setupStarInteractivity(container);
}

function setupStarInteractivity(container) {
  const tooltip = document.getElementById("starTooltip");
  container.querySelectorAll(".star-node").forEach((node) => {
    const star = STAR_TEAM.find((s) => s.id === node.dataset.starId);
    if (!star) return;
    node.addEventListener("mouseenter", () => {
      tooltip.innerHTML = `<strong>${star.name}</strong><span>${star.role}</span>`;
      tooltip.classList.remove("hidden");
    });
    node.addEventListener("mousemove", (e) => {
      tooltip.style.left = e.clientX + 16 + "px";
      tooltip.style.top = e.clientY + 12 + "px";
    });
    node.addEventListener("mouseleave", () => tooltip.classList.add("hidden"));
    node.addEventListener("click", () => openStarProfile(star));
  });
}

function openStarProfile(star) {
  document.getElementById("starProfileIcon").innerHTML = starFlareSVG(star.color, 90);
  document.getElementById("starProfileName").textContent = star.name;
  document.getElementById("starProfileRole").textContent = star.role;
  document.getElementById("starProfileDetails").textContent = star.details || star.blurb;
  document.getElementById("starProfileOverlay").classList.remove("hidden");
}
document.getElementById("closeStarProfileBtn").addEventListener("click", () => {
  document.getElementById("starProfileOverlay").classList.add("hidden");
});

function renderConstellation() {
  const el = document.getElementById("constellationMain");
  if (el) buildConstellation(el, { showLabels: true, scale: 1 });
}

// ---------- loading-screen signal animation (Boss -> Andrei -> whole team) ----------
// Shown while we check for a saved login, instead of flashing the username
// field for a split second before auto-login kicks in.
let loadingAnimTimer = null;

function loadingSetActive(container, starIds) {
  container.querySelectorAll(".star-node.active, .star-line.active").forEach((el) => el.classList.remove("active"));
  starIds.forEach((id) => {
    const node = container.querySelector(`.star-node[data-star-id="${id}"]`);
    const line = container.querySelector(`.star-line[data-star-id="${id}"]`);
    if (node) node.classList.add("active");
    if (line) line.classList.add("active");
  });
}

function startLoadingAnimation() {
  const container = document.getElementById("constellationLoading");
  if (!container) return;
  buildConstellation(container, { showLabels: true, scale: 1 });

  const allSpokeIds = STAR_TEAM.filter((s) => !s.isHub).map((s) => s.id);

  // Step 1: signal from Boss (Captain) to Andrei (hub) - lights just that spoke.
  // Step 2: Andrei relays it out to the whole team - lights every spoke at once.
  // Then a brief dark pause before looping.
  const STEP1_MS = 750, STEP2_MS = 950, PAUSE_MS = 450;

  function loop() {
    loadingSetActive(container, ["captain"]);
    loadingAnimTimer = setTimeout(() => {
      loadingSetActive(container, allSpokeIds);
      loadingAnimTimer = setTimeout(() => {
        loadingSetActive(container, []);
        loadingAnimTimer = setTimeout(loop, PAUSE_MS);
      }, STEP2_MS);
    }, STEP1_MS);
  }
  loop();
}

function stopLoadingAnimation() {
  if (loadingAnimTimer) clearTimeout(loadingAnimTimer);
  loadingAnimTimer = null;
}

// ---------- animated progress during generation ----------
const STAGE_PATTERNS = [
  { match: /Writer/i, starId: "story" },
  { match: /Illustrator/i, starId: "design" },
  { match: /Builder/i, starId: "assembly" },
  { match: /Inspector/i, starId: "checking" },
  { match: /Printer/i, starId: "printing" },
];

function clearStarActivation() {
  document.querySelectorAll(".star-node.active, .star-line.active").forEach((el) => el.classList.remove("active"));
}

function activateStar(starId) {
  clearStarActivation();
  const container = document.getElementById("constellationMain");
  if (!container) return;
  const node = container.querySelector(`.star-node[data-star-id="${starId}"]`);
  const line = container.querySelector(`.star-line[data-star-id="${starId}"]`);
  if (node) node.classList.add("active");
  if (line) line.classList.add("active");
}

// Some steps (esp. Checking/Inspector) can finish in milliseconds - without
// this, their star would flash and vanish before anyone sees it "work".
// This queue guarantees every star stays lit for at least MIN_STAR_DURATION
// before the next one takes over, chaining activations in order.
const MIN_STAR_DURATION = 1000;
let starQueue = Promise.resolve();
let lastStarSwitchAt = 0;

function queueActivateStar(starId) {
  starQueue = starQueue.then(() => {
    const elapsed = lastStarSwitchAt ? Date.now() - lastStarSwitchAt : MIN_STAR_DURATION;
    const wait = Math.max(0, MIN_STAR_DURATION - elapsed);
    return new Promise((resolve) => {
      setTimeout(() => {
        activateStar(starId);
        lastStarSwitchAt = Date.now();
        resolve();
      }, wait);
    });
  });
  return starQueue;
}

async function finishStarQueue() {
  await starQueue;
  const elapsed = lastStarSwitchAt ? Date.now() - lastStarSwitchAt : 0;
  const wait = Math.max(0, MIN_STAR_DURATION - elapsed);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastStarSwitchAt = 0;
}

function setGenerationMode(active) {
  document.getElementById("bridgeNav").classList.toggle("hidden", active);
  document.getElementById("bridgeCaption").classList.toggle("hidden", active);
  document.getElementById("genStatus").classList.toggle("hidden", !active);
  if (!active) clearStarActivation();
}

// ---------- realistic glowing star icon (SVG, no emoji) ----------
function starFlareSVG(color, size) {
  const s = size || 90;
  const c = s / 2;
  const uid = "g" + Math.random().toString(36).slice(2, 8);
  return `
    <svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
      <defs>
        <radialGradient id="${uid}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="35%" stop-color="${color}" />
          <stop offset="100%" stop-color="${color}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx="${c}" cy="${c}" r="${s * 0.6}" fill="url(#${uid})" opacity="0.3" />
      <circle cx="${c}" cy="${c}" r="${s * 0.4}" fill="url(#${uid})" opacity="0.6" />
      <g stroke="${color}" stroke-linecap="round">
        <line x1="${c}" y1="${s * 0.02}" x2="${c}" y2="${s * 0.98}" stroke-width="${s * 0.016}" opacity="0.8" />
        <line x1="${s * 0.02}" y1="${c}" x2="${s * 0.98}" y2="${c}" stroke-width="${s * 0.016}" opacity="0.8" />
        <line x1="${s * 0.2}" y1="${s * 0.2}" x2="${s * 0.8}" y2="${s * 0.8}" stroke-width="${s * 0.008}" opacity="0.4" />
        <line x1="${s * 0.8}" y1="${s * 0.2}" x2="${s * 0.2}" y2="${s * 0.8}" stroke-width="${s * 0.008}" opacity="0.4" />
      </g>
      <circle cx="${c}" cy="${c}" r="${s * 0.08}" fill="#ffffff" />
    </svg>`;
}

// ---------- login flow ----------
let pendingUsername = "";
let passwordVisible = false;

document.getElementById("usernameNextBtn").addEventListener("click", () => {
  const val = document.getElementById("usernameInput").value.trim();
  if (!val) {
    document.getElementById("usernameStatus").textContent = "Please enter a username.";
    return;
  }
  pendingUsername = val;
  showScreen("loginPassword");
  document.getElementById("passwordInput").focus();
});
document.getElementById("usernameInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("usernameNextBtn").click();
});

document.getElementById("backToUsernameBtn").addEventListener("click", () => showScreen("loginUsername"));

document.getElementById("toggleKeyVisibility").addEventListener("click", () => {
  passwordVisible = !passwordVisible;
  document.getElementById("passwordInput").type = passwordVisible ? "text" : "password";
});

async function attemptLogin() {
  const password = document.getElementById("passwordInput").value.trim();
  if (!password) {
    document.getElementById("passwordStatus").textContent = "Please enter a password.";
    return;
  }
  document.getElementById("passwordStatus").textContent = "Checking...";
  await window.api.setAccount(pendingUsername, password);
  const result = await window.api.checkBalance();
  if (result.ok) {
    document.getElementById("passwordStatus").textContent = "";
    await enterBridge();
  } else {
    document.getElementById("passwordStatus").textContent = result.error || "Login failed.";
  }
}
document.getElementById("loginBtn").addEventListener("click", attemptLogin);
document.getElementById("passwordInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") attemptLogin();
});

async function enterBridge() {
  showScreen("bridge");
  setGenerationMode(false);
  renderConstellation();
  refreshBalance();
  refreshPrices();
  window.api.getVersion().then((v) => {
    const el = document.getElementById("versionTag");
    if (el) el.textContent = `(v${v})`;
  });
}

// on load: show the loading constellation while we check for a saved login,
// instead of flashing the username screen for a split second first
(async function initialLoad() {
  startLoadingAnimation();
  const cfg = await window.api.getConfig();
  if (cfg.username && cfg.password) {
    pendingUsername = cfg.username;
    const result = await window.api.checkBalance();
    if (result.ok) {
      stopLoadingAnimation();
      await enterBridge();
      return;
    }
  }
  stopLoadingAnimation();
  showScreen("loginUsername");
})();

// ---------- bridge navigation ----------
document.getElementById("navCreate").addEventListener("click", () => { showScreen("create"); refreshBalanceCreate(); refreshPrices(); });
document.getElementById("backFromCreate").addEventListener("click", () => showScreen("bridge"));

// ---------- balance & prices ----------
async function refreshBalance() {
  const result = await window.api.checkBalance();
  const pill = document.getElementById("balancePill");
  if (result.ok) {
    pill.textContent = `Balance: $${result.balance}`;
    pill.classList.remove("hidden");
  } else {
    pill.classList.add("hidden");
  }
}
async function refreshBalanceCreate() {
  const result = await window.api.checkBalance();
  const pill = document.getElementById("balancePillCreate");
  if (result.ok) {
    pill.textContent = `Balance: $${result.balance}`;
    pill.classList.remove("hidden");
  } else {
    pill.classList.add("hidden");
  }
}
async function refreshPrices() {
  const result = await window.api.getPrices();
  if (result.ok) {
    document.getElementById("priceTagPreschool").textContent = `$${result.prices.preschool} per presentation`;
    document.getElementById("priceTagBrickmoto").textContent = `$${result.prices.brickmoto} per presentation`;
  }
}
window.api.onBalanceUpdated((balance) => {
  [document.getElementById("balancePill"), document.getElementById("balancePillCreate")].forEach((pill) => {
    pill.textContent = `Balance: $${balance}`;
    pill.classList.remove("hidden");
  });
});

// ---------- settings modal ----------
const settingsModal = document.getElementById("settingsModal");
document.getElementById("settingsBtn").addEventListener("click", async () => {
  document.getElementById("updateCheckStatus").textContent = "";
  settingsModal.classList.remove("hidden");
});
document.getElementById("closeSettingsBtn").addEventListener("click", () => settingsModal.classList.add("hidden"));
document.getElementById("checkUpdateBtn").addEventListener("click", async () => {
  document.getElementById("updateCheckStatus").textContent = "Checking...";
  await window.api.checkForUpdatesNow();
});
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await window.api.deleteAccount();
  settingsModal.classList.add("hidden");
  document.getElementById("usernameInput").value = "";
  document.getElementById("passwordInput").value = "";
  document.getElementById("usernameStatus").textContent = "";
  document.getElementById("passwordStatus").textContent = "";
  showScreen("loginUsername");
});

// ---------- balance / top-up popup ----------
const ZALO_LINK = "https://zaloapp.com/qr/p/1p4vnkds7fno";
const balanceModal = document.getElementById("balanceModal");
document.getElementById("zaloLink").href = ZALO_LINK;
function openBalanceModal() { balanceModal.classList.remove("hidden"); }
document.getElementById("balancePill").addEventListener("click", openBalanceModal);
document.getElementById("balancePillCreate").addEventListener("click", openBalanceModal);
document.getElementById("closeBalanceModalBtn").addEventListener("click", () => balanceModal.classList.add("hidden"));

// ---------- tabs (Preschool / Brickmoto) ----------
let currentTrack = "preschool";
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentTrack = tab.dataset.track;
    document.getElementById("preschoolPanel").classList.toggle("hidden", currentTrack !== "preschool");
    document.getElementById("brickmotoPanel").classList.toggle("hidden", currentTrack !== "brickmoto");
  });
});

// ---------- create lesson (with animated Star Team progress) ----------
const genLogEl = document.getElementById("genLog");
const genStatusEl = document.getElementById("genStatus");
const logToggleBtn = document.getElementById("logToggleBtn");

logToggleBtn.addEventListener("click", () => {
  genLogEl.classList.toggle("hidden");
});

window.api.onLessonLog((msg) => {
  logToggleBtn.classList.remove("hidden");
  const span = document.createElement("span");
  const isWarning = msg.includes("⚠️") || msg.includes("⚠");
  if (isWarning) span.className = "log-warning";
  span.textContent = msg;
  genLogEl.appendChild(span);
  genLogEl.scrollTop = genLogEl.scrollHeight;

  const stage = STAGE_PATTERNS.find((s) => s.match.test(msg));
  if (stage) {
    queueActivateStar(stage.starId);
    const star = STAR_TEAM.find((s) => s.id === stage.starId);
    const clean = msg.replace(/^[^\w]+/, "").trim();
    genStatusEl.textContent = `${star ? star.name : ""} ${clean}`;
  } else if (!isWarning) {
    genStatusEl.textContent = msg.replace(/^[^\w]+/, "").trim();
  }
});

const regenerateModal = document.getElementById("regenerateModal");
let pendingRegenerateChoice = null;

function askRegenerateChoice(topic) {
  return new Promise((resolve) => {
    document.getElementById("regenerateText").textContent =
      `"${topic}" already has saved materials. Rebuild the presentation from what's already there (free), or delete it and create a fresh version (charges again)?`;
    regenerateModal.classList.remove("hidden");
    pendingRegenerateChoice = resolve;
  });
}
document.getElementById("rebuildExistingBtn").addEventListener("click", () => {
  regenerateModal.classList.add("hidden");
  if (pendingRegenerateChoice) pendingRegenerateChoice("rebuild");
});
document.getElementById("regenerateFreshBtn").addEventListener("click", () => {
  regenerateModal.classList.add("hidden");
  if (pendingRegenerateChoice) pendingRegenerateChoice("fresh");
});
document.getElementById("cancelRegenerateBtn").addEventListener("click", () => {
  regenerateModal.classList.add("hidden");
  if (pendingRegenerateChoice) pendingRegenerateChoice("cancel");
});

document.getElementById("createBtn").addEventListener("click", async () => {
  const topicInput = document.getElementById("topicInput");
  const topic = topicInput.value.trim();
  if (!topic) { topicInput.focus(); return; }

  let regenerate = false;
  const exists = await window.api.checkContentExists(topic);
  if (exists) {
    const choice = await askRegenerateChoice(topic);
    if (choice === "cancel") return;
    regenerate = choice === "fresh";
  }

  const notes = document.getElementById("notesInput").value.trim();

  // switch to the Bridge in "generating" mode: constellation takes over,
  // each star lights up in turn as the team works
  genLogEl.textContent = "";
  genLogEl.classList.add("hidden");
  logToggleBtn.classList.add("hidden");
  starQueue = Promise.resolve();
  lastStarSwitchAt = 0;
  showScreen("bridge");
  setGenerationMode(true);
  genStatusEl.textContent = "⏳ Please don't close the app - the Star Team is working, this can take a few minutes.";

  await window.api.createLesson(topic, currentTrack, notes, regenerate);
  await finishStarQueue();

  setGenerationMode(false);
  showScreen("create");
  refreshBalanceCreate();
  refreshBalance();
});
document.getElementById("topicInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("createBtn").click();
});
document.getElementById("openFolderBtn").addEventListener("click", () => window.api.openOutputFolder());

// ---------- auto-update banner ----------
window.api.onUpdateStatus(({ text: msg, percent } = {}) => {
  const banner = document.getElementById("updateBanner");
  const bannerText = document.getElementById("updateBannerText");
  const bannerProgressWrap = document.getElementById("updateBannerProgressWrap");
  const bannerProgressFill = document.getElementById("updateBannerProgressFill");
  const updateCheckStatus = document.getElementById("updateCheckStatus");
  const progressWrap = document.getElementById("updateProgressWrap");
  const progressFill = document.getElementById("updateProgressFill");

  if (!msg) {
    banner.classList.add("hidden");
    banner.classList.remove("clickable");
    banner.onclick = null;
    bannerProgressWrap.classList.add("hidden");
    progressWrap.classList.add("hidden");
    return;
  }

  // Progress bars: shown only while we have a real 0-100 percent (downloading),
  // hidden for plain status text (checking / found / ready / error messages).
  const hasProgress = typeof percent === "number" && percent >= 0 && percent < 100;
  if (hasProgress) {
    bannerProgressWrap.classList.remove("hidden");
    bannerProgressFill.style.width = percent + "%";
    progressWrap.classList.remove("hidden");
    progressFill.style.width = percent + "%";
  } else {
    bannerProgressWrap.classList.add("hidden");
    progressWrap.classList.add("hidden");
  }

  if (msg.startsWith("READY:")) {
    bannerText.textContent = "🔄 " + msg.slice(6) + " (click here)";
    banner.classList.add("clickable");
    banner.onclick = () => window.api.installUpdateNow();
    banner.classList.remove("hidden");
    updateCheckStatus.textContent = msg.slice(6);
    return;
  }

  banner.classList.remove("clickable");
  banner.onclick = null;
  bannerText.textContent = "🔄 " + msg;
  banner.classList.remove("hidden");

  // Settings panel text now always mirrors the live status (checking / found /
  // downloading NN% / latest version), instead of freezing on the first message.
  updateCheckStatus.textContent = msg.toLowerCase().includes("latest version")
    ? "You're on the latest version."
    : msg;
});

window.addEventListener("resize", () => {
  if (!screens.bridge.classList.contains("hidden")) renderConstellation();
});
