const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wiprd', {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  aiChat: (payload) => ipcRenderer.invoke('ai:chat', payload)
});
