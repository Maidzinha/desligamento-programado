const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  get: () => ipcRenderer.invoke('get'),
  start: (s) => ipcRenderer.invoke('start', s),
  cancel: () => ipcRenderer.invoke('cancel'),
  set: (p) => ipcRenderer.invoke('set', p),
  win: (a) => ipcRenderer.send('win', a),
  onStatus: (cb) => ipcRenderer.on('status', (_, s) => cb(s)),
  onMax: (cb) => ipcRenderer.on('maxed', (_, v) => cb(v))
});
