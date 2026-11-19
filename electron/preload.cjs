const { contextBridge, ipcRenderer } = require('electron')

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

// Narrow, explicit surface: ipcRenderer itself is never exposed.
contextBridge.exposeInMainWorld('codex', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  getAppConfig: () => ipcRenderer.invoke('codex:app:config'),
  getSettings: () => ipcRenderer.invoke('codex:settings:get'),
  listPlugins: () => ipcRenderer.invoke('codex:plugins:list'),
  savePlugins: (store) => ipcRenderer.invoke('codex:plugins:save', store),
  importPlugins: () => ipcRenderer.invoke('codex:plugins:import'),
  saveSettings: (patch) => ipcRenderer.invoke('codex:settings:save', patch),
  listConversations: () => ipcRenderer.invoke('codex:conversations:list'),
  saveConversations: (list) => ipcRenderer.invoke('codex:conversations:save', list),
  clearConversations: () => ipcRenderer.invoke('codex:conversations:clear'),
  startChat: (payload) => ipcRenderer.invoke('codex:chat:start', payload),
  abortChat: (requestId) => ipcRenderer.invoke('codex:chat:abort', requestId),
  testConnection: (payload) => ipcRenderer.invoke('codex:chat:test', payload),
  onChatEvent: (callback) => subscribe('codex:chat:event', callback),
  onSettingsChanged: (callback) => subscribe('codex:settings:changed', callback),
})
