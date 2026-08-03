const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  setAccount: (username, password) => ipcRenderer.invoke("config:setAccount", { username, password }),
  deleteAccount: () => ipcRenderer.invoke("config:deleteAccount"),
  setImageMode: (withImages) => ipcRenderer.invoke("config:setImageMode", withImages),
  checkBalance: () => ipcRenderer.invoke("account:checkBalance"),

  createLesson: (topic, track) => ipcRenderer.invoke("lesson:create", { topic, track }),
  onLessonLog: (callback) => {
    ipcRenderer.on("lesson:log", (event, msg) => callback(msg));
  },

  openOutputFolder: () => ipcRenderer.invoke("files:openOutputFolder"),

  onUpdateStatus: (callback) => {
    ipcRenderer.on("update:status", (event, msg) => callback(msg));
  },
  installUpdateNow: () => ipcRenderer.invoke("update:installNow"),
  checkForUpdatesNow: () => ipcRenderer.invoke("update:checkNow"),
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
});
