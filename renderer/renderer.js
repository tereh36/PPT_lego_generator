// ---------- brand name (colored per-letter "Star Team") ----------
function renderBrandName(el) {
  if (!el) return;
  el.innerHTML = "Star Team".split("").map((ch) => `<span class="brand-letter">${ch}</span>`).join("");
}
["brandName", "brandName2", "brandName3"].forEach((id) => renderBrandName(document.getElementById(id)));

// ---------- screen navigation ----------
const screens = {
  loginUsername: document.getElementById("screen-login-username"),
  loginPassword: document.getElementById("screen-login-password"),
  bridge: document.getElementById("screen-bridge"),
  create: document.getElementById("screen-create"),
  team: document.getElementById("screen-team"),
  system: document.getElementById("screen-system"),
};
function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

// ---------- constellation rendering (used on Bridge + System screen) ----------
function buildConstellation(container, opts) {
  const showLabels = !!opts.showLabels;
  const w = container.clientWidth || 700;
  const h = container.clientHeight || 400;
  const hub = STAR_TEAM.find((s) => s.isHub);
  const others = STAR_TEAM.filter((s) => !s.isHub);

  const hubX = w / 2, hubY = h / 2;
  const radiusX = w * 0.38, radiusY = h * 0.38;
  const positions = { [hub.id]: { x: hubX, y: hubY } };
  others.forEach((star, i) => {
    const angle = (i / others.length) * Math.PI * 2 - Math.PI / 2;
    positions[star.id] = { x: hubX + Math.cos(angle) * radiusX, y: hubY + Math.sin(angle) * radiusY };
  });

  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%"><defs>`;
  STAR_TEAM.forEach((star) => {
    svg += `<radialGradient id="grad-${star.id}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" /><stop offset="35%" stop-color="${star.color}" />
      <stop offset="100%" stop-color="${star.color}" stop-opacity="0" /></radialGradient>`;
  });
  svg += `</defs>`;
  // lines from hub to every other star
  others.forEach((star) => {
    const p = positions[star.id];
    svg += `<line x1="${hubX}" y1="${hubY}" x2="${p.x}" y2="${p.y}" stroke="${star.color}" stroke-opacity="0.55" stroke-width="1.5" />`;
  });
  // star-flare nodes
  STAR_TEAM.forEach((star) => {
    const p = positions[star.id];
    const s = star.isHub ? 46 : 34;
    svg += `<circle cx="${p.x}" cy="${p.y}" r="${s * 0.5}" fill="url(#grad-${star.id})" opacity="0.6" />`;
    svg += `<g stroke="${star.color}" stroke-linecap="round">
      <line x1="${p.x}" y1="${p.y - s * 0.48}" x2="${p.x}" y2="${p.y + s * 0.48}" stroke-width="${s * 0.02}" opacity="0.85" />
      <line x1="${p.x - s * 0.48}" y1="${p.y}" x2="${p.x + s * 0.48}" y2="${p.y}" stroke-width="${s * 0.02}" opacity="0.85" />
    </g>`;
    svg += `<circle cx="${p.x}" cy="${p.y}" r="${s * 0.09}" fill="#ffffff" />`;
    if (showLabels) {
      svg += `<text x="${p.x}" y="${p.y + s * 0.5 + 16}" text-anchor="middle" font-size="12" fill="#EAF2FF" font-family="Segoe UI, Arial">${star.name}</text>`;
    }
  });
  svg += `</svg>`;
  container.innerHTML = svg;
}

function renderConstellations() {
  const mini = document.getElementById("constellationMini");
  const full = document.getElementById("constellationFull");
  if (mini && !mini.classList.contains("hidden") === false) buildConstellation(mini, { showLabels: false });
  if (full) buildConstellation(full, { showLabels: true });
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
      <circle cx="${c}" cy="${c}" r="${s * 0.46}" fill="url(#${uid})" opacity="0.55" />
      <g stroke="${color}" stroke-linecap="round">
        <line x1="${c}" y1="${s * 0.04}" x2="${c}" y2="${s * 0.96}" stroke-width="${s * 0.02}" opacity="0.85" />
        <line x1="${s * 0.04}" y1="${c}" x2="${s * 0.96}" y2="${c}" stroke-width="${s * 0.02}" opacity="0.85" />
        <line x1="${s * 0.18}" y1="${s * 0.18}" x2="${s * 0.82}" y2="${s * 0.82}" stroke-width="${s * 0.012}" opacity="0.5" />
        <line x1="${s * 0.82}" y1="${s * 0.18}" x2="${s * 0.18}" y2="${s * 0.82}" stroke-width="${s * 0.012}" opacity="0.5" />
      </g>
      <circle cx="${c}" cy="${c}" r="${s * 0.09}" fill="#ffffff" />
      <circle cx="${c}" cy="${c}" r="${s * 0.16}" fill="${color}" opacity="0.35" />
    </svg>`;
}

// ---------- team carousel ----------
function renderTeamCarousel() {
  const carousel = document.getElementById("teamCarousel");
  carousel.innerHTML = STAR_TEAM.map((star) => `
    <div class="star-card">
      <div class="star-icon-wrap">${starFlareSVG(star.color, 100)}</div>
      <div class="star-name">${star.name}</div>
      <div class="star-role">${star.role}</div>
      <div class="star-blurb">${star.blurb}</div>
      ${star.hasDuties ? "" : '<div class="star-duties">No duties listed - you\'re the Captain!</div>'}
    </div>
  `).join("");
}
document.getElementById("teamPrevBtn").addEventListener("click", () => {
  document.getElementById("teamCarousel").scrollBy({ left: -280, behavior: "smooth" });
});
document.getElementById("teamNextBtn").addEventListener("click", () => {
  document.getElementById("teamCarousel").scrollBy({ left: 280, behavior: "smooth" });
});

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
  renderConstellations();
  refreshBalance();
  refreshPrices();
  window.api.getVersion().then((v) => {
    const el = document.getElementById("versionTag");
    if (el) el.textContent = `(v${v})`;
  });
}

// on load: if already logged in (saved config), skip straight to bridge
(async function initialLoad() {
  const cfg = await window.api.getConfig();
  if (cfg.username && cfg.password) {
    pendingUsername = cfg.username;
    const result = await window.api.checkBalance();
    if (result.ok) {
      await enterBridge();
      return;
    }
  }
  showScreen("loginUsername");
})();

// ---------- bridge navigation ----------
document.getElementById("navCreate").addEventListener("click", () => { showScreen("create"); refreshBalanceCreate(); refreshPrices(); });
document.getElementById("navTeam").addEventListener("click", () => { renderTeamCarousel(); showScreen("team"); });
document.getElementById("navSystem").addEventListener("click", () => { renderConstellations(); showScreen("system"); });
document.getElementById("backFromCreate").addEventListener("click", () => showScreen("bridge"));
document.getElementById("backFromTeam").addEventListener("click", () => showScreen("bridge"));
document.getElementById("backFromSystem").addEventListener("click", () => showScreen("bridge"));

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
  const cfg = await window.api.getConfig();
  document.getElementById("imageModeToggle").checked = cfg.withImages !== false;
  document.getElementById("updateCheckStatus").textContent = "";
  settingsModal.classList.remove("hidden");
});
document.getElementById("closeSettingsBtn").addEventListener("click", () => settingsModal.classList.add("hidden"));
document.getElementById("imageModeToggle").addEventListener("change", (e) => window.api.setImageMode(e.target.checked));
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

// ---------- create lesson ----------
const logEl = document.getElementById("log");
window.api.onLessonLog((msg) => {
  logEl.classList.remove("hidden");
  const span = document.createElement("span");
  if (msg.includes("⚠️") || msg.includes("⚠")) span.className = "log-warning";
  span.textContent = msg;
  logEl.appendChild(span);
  logEl.scrollTop = logEl.scrollHeight;
});

document.getElementById("createBtn").addEventListener("click", async () => {
  const topicInput = document.getElementById("topicInput");
  const topic = topicInput.value.trim();
  if (!topic) { topicInput.focus(); return; }
  logEl.textContent = "";
  logEl.classList.remove("hidden");
  const btn = document.getElementById("createBtn");
  btn.disabled = true;
  btn.textContent = "Generating...";

  const notes = document.getElementById("notesInput").value.trim();
  await window.api.createLesson(topic, currentTrack, notes);

  btn.disabled = false;
  btn.textContent = "Create Presentation";
  refreshBalanceCreate();
  refreshBalance();
});
document.getElementById("topicInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("createBtn").click();
});
document.getElementById("openFolderBtn").addEventListener("click", () => window.api.openOutputFolder());

// ---------- auto-update banner ----------
window.api.onUpdateStatus((msg) => {
  const banner = document.getElementById("updateBanner");
  const updateCheckStatus = document.getElementById("updateCheckStatus");
  if (!msg) {
    banner.classList.add("hidden");
    banner.classList.remove("clickable");
    banner.onclick = null;
    return;
  }
  if (msg.startsWith("READY:")) {
    banner.textContent = "🔄 " + msg.slice(6) + " (click here)";
    banner.classList.add("clickable");
    banner.onclick = () => window.api.installUpdateNow();
    banner.classList.remove("hidden");
    return;
  }
  banner.classList.remove("clickable");
  banner.onclick = null;
  banner.textContent = "🔄 " + msg;
  banner.classList.remove("hidden");
  if (msg.toLowerCase().includes("latest version")) {
    updateCheckStatus.textContent = "You're on the latest version.";
  } else if (msg.toLowerCase().includes("found")) {
    updateCheckStatus.textContent = msg;
  }
});

window.addEventListener("resize", () => {
  if (!screens.bridge.classList.contains("hidden") || !screens.system.classList.contains("hidden")) {
    renderConstellations();
  }
});
