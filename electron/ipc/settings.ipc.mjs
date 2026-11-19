import { BrowserWindow, ipcMain } from 'electron'
import { getAppConfig } from '../services/appConfig.mjs'
import {
  clearConversations,
  getSettings,
  listConversations,
  saveConversations,
  saveSettings,
} from '../services/store.mjs'

function broadcast(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerSettingsIpc() {
  ipcMain.handle('codex:app:config', () => getAppConfig())

  ipcMain.handle('codex:settings:get', () => getSettings())

  ipcMain.handle('codex:settings:save', (_event, patch) => {
    const next = saveSettings(patch && typeof patch === 'object' ? patch : {})
    broadcast('codex:settings:changed', next)
    return next
  })

  ipcMain.handle('codex:conversations:list', () => listConversations())

  ipcMain.handle('codex:conversations:save', (_event, list) => saveConversations(list))

  ipcMain.handle('codex:conversations:clear', () => {
    clearConversations()
    return { ok: true }
  })
}
