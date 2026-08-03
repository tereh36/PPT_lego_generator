let currentTrack = "preschool";
let passwordVisible = false;

const els = {
  settingsBtn: document.getElementById("settingsBtn"),
  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  usernameInput: document.getElementById("usernameInput"),
  passwordInput: document.getElementById("passwordInput"),
  toggleKeyVisibility: document.getElementById("toggleKeyVisibility"),
  saveKeyBtn: document.getElementById("saveKeyBtn"),
  deleteKeyBtn: document.getElementById("deleteKeyBtn"),
  keyStatus: document.getElementById("keyStatus"),
  imageModeToggle: document.getElementById("imageModeToggle"),
  balancePill: document.getElementById("balancePill"),
  tabs: document.querySelectorAll(".tab"),
  preschoolPanel: document.getElementById("preschoolPanel"),
  brickmotoPanel: document.getElementById("brickmotoPanel"),
  topicInput: document.getElementById("topicInput"),
  createBtn: document.getElementById("createBtn"),
  log: document.getElementById("log"),
  updateBanner: document.getElementById("updateBanner"),
  openFolderBtn: document.getElementById("openFolderBtn"),
  checkUpdateBtn: document.getElementById("checkUpdateBtn"),
  updateCheckStatus: document.getElementById("updateCheckStatus"),
};

// ---------- баланс ----------
async function refreshBalance() {
  const result = await window.api.checkBalance();
  if (result.ok) {
    els.balancePill.textContent = `Balance: $${result.balance}`;
    els.balancePill.classList.remove("hidden");
  } else {
    els.balancePill.classList.add("hidden");
  }
}

// ---------- настройки / логин ----------
async function refreshSettingsUI() {
  const cfg = await window.api.getConfig();
  els.imageModeToggle.checked = cfg.withImages !== false;
  if (cfg.username) {
    els.usernameInput.value = cfg.username;
    els.passwordInput.value = cfg.password || "";
    els.keyStatus.textContent = "Logged in.";
    refreshBalance();
  } else {
    els.usernameInput.value = "";
    els.passwordInput.value = "";
    els.keyStatus.textContent = "Not logged in — generation is unavailable until you log in.";
    els.balancePill.classList.add("hidden");
  }
}

els.settingsBtn.addEventListener("click", async () => {
  await refreshSettingsUI();
  els.updateCheckStatus.textContent = "";
  els.settingsModal.classList.remove("hidden");
});
els.closeSettingsBtn.addEventListener("click", () => {
  els.settingsModal.classList.add("hidden");
});

els.toggleKeyVisibility.addEventListener("click", () => {
  passwordVisible = !passwordVisible;
  els.passwordInput.type = passwordVisible ? "text" : "password";
});

els.saveKeyBtn.addEventListener("click", async () => {
  const username = els.usernameInput.value.trim();
  const password = els.passwordInput.value.trim();
  if (!username || !password) {
    els.keyStatus.textContent = "Enter both username and password.";
    return;
  }
  await window.api.setAccount(username, password);
  els.keyStatus.textContent = "Checking...";
  const result = await window.api.checkBalance();
  if (result.ok) {
    els.keyStatus.textContent = "Logged in.";
    els.balancePill.textContent = `Balance: $${result.balance}`;
    els.balancePill.classList.remove("hidden");
  } else {
    els.keyStatus.textContent = result.error || "Login failed.";
  }
});

els.deleteKeyBtn.addEventListener("click", async () => {
  await window.api.deleteAccount();
  els.usernameInput.value = "";
  els.passwordInput.value = "";
  els.keyStatus.textContent = "Logged out.";
  els.balancePill.classList.add("hidden");
});

els.imageModeToggle.addEventListener("change", async () => {
  await window.api.setImageMode(els.imageModeToggle.checked);
});

// ---------- проверка обновлений (кнопка) ----------
els.checkUpdateBtn.addEventListener("click", async () => {
  els.updateCheckStatus.textContent = "Checking...";
  await window.api.checkForUpdatesNow();
});

// ---------- вкладки Preschool / Brickmoto ----------
els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    els.tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentTrack = tab.dataset.track;
    els.preschoolPanel.classList.toggle("hidden", currentTrack !== "preschool");
    els.brickmotoPanel.classList.toggle("hidden", currentTrack !== "brickmoto");
  });
});

// ---------- создание презентации ----------
window.api.onLessonLog((msg) => {
  els.log.classList.remove("hidden");
  const span = document.createElement("span");
  if (msg.includes("⚠️") || msg.includes("⚠")) span.className = "log-warning";
  span.textContent = msg;
  els.log.appendChild(span);
  els.log.scrollTop = els.log.scrollHeight;
});

els.createBtn.addEventListener("click", async () => {
  const topic = els.topicInput.value.trim();
  if (!topic) {
    els.topicInput.focus();
    return;
  }
  els.log.textContent = "";
  els.log.classList.remove("hidden");
  els.createBtn.disabled = true;
  els.createBtn.textContent = "Generating...";

  const result = await window.api.createLesson(topic, currentTrack);

  els.createBtn.disabled = false;
  els.createBtn.textContent = "Create Presentation";

  if (result.needsAccount) {
    els.settingsModal.classList.remove("hidden");
    await refreshSettingsUI();
  } else {
    refreshBalance();
  }
});

els.topicInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.createBtn.click();
});

// ---------- открыть папку с файлами ----------
els.openFolderBtn.addEventListener("click", () => {
  window.api.openOutputFolder();
});

// ---------- автообновление ----------
window.api.onUpdateStatus((msg) => {
  if (!msg) {
    els.updateBanner.classList.add("hidden");
    els.updateBanner.classList.remove("clickable");
    els.updateBanner.onclick = null;
    return;
  }
  if (msg.startsWith("READY:")) {
    els.updateBanner.textContent = "🔄 " + msg.slice(6) + " (click here)";
    els.updateBanner.classList.add("clickable");
    els.updateBanner.onclick = () => window.api.installUpdateNow();
    els.updateBanner.classList.remove("hidden");
    return;
  }
  els.updateBanner.classList.remove("clickable");
  els.updateBanner.onclick = null;
  els.updateBanner.textContent = "🔄 " + msg;
  els.updateBanner.classList.remove("hidden");
  if (msg.toLowerCase().includes("latest version") || msg.toLowerCase().includes("not available")) {
    els.updateCheckStatus.textContent = "You're on the latest version.";
  } else if (msg.toLowerCase().includes("found")) {
    els.updateCheckStatus.textContent = msg;
  }
});

// первичная загрузка (логин + баланс, если уже сохранены)
refreshSettingsUI();
