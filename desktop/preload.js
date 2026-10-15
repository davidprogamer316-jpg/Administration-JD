const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopConfig', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (cfg) => ipcRenderer.invoke('config:save', cfg),
  retry: () => ipcRenderer.invoke('app:retry'),
  configure: () => ipcRenderer.invoke('app:configure'),
});
