const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  setAccount: (username, password) => ipcRenderer.invoke("config:setAccount", { username, password }),
  deleteAccount: () => ipcRenderer.invoke("config:deleteAccount"),
  setImageMode: (withImages) => ipcRenderer.invoke("config:setImageMode", withImages),
  checkBalance: () => ipcRenderer.invoke("account:checkBalance"),
  getPrices: () => ipcRenderer.invoke("account:getPrices"),

  createLesson: (topic, track, notes, regenerate) => ipcRenderer.invoke("lesson:create", { topic, track, notes, regenerate }),
  checkContentExists: (topic) => ipcRenderer.invoke("lesson:checkExists", { topic }),
  onLessonLog: (callback) => {
    ipcRenderer.removeAllListeners("lesson:log");
    ipcRenderer.on("lesson:log", (event, msg) => callback(msg));
  },
  onBalanceUpdated: (callback) => {
    ipcRenderer.removeAllListeners("account:balanceUpdated");
    ipcRenderer.on("account:balanceUpdated", (event, balance) => callback(balance));
  },

  openOutputFolder: () => ipcRenderer.invoke("files:openOutputFolder"),

  onUpdateStatus: (callback) => {
    ipcRenderer.removeAllListeners("update:status");
    ipcRenderer.on("update:status", (event, msg) => callback(msg));
  },
  installUpdateNow: () => ipcRenderer.invoke("update:installNow"),
  checkForUpdatesNow: () => ipcRenderer.invoke("update:checkNow"),
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
});
