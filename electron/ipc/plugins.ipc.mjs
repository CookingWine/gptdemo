import { BrowserWindow, dialog, ipcMain } from 'electron'
import path from 'node:path'
import {
  decryptToHiddenFolder,
  getPlugins,
  importFromDirectory,
  savePlugins,
} from '../services/plugins.mjs'

const EMPTY_REPORT = {
  canceled: true,
  importedAgents: [],
  importedSkills: [],
  errors: [],
  ignored: [],
}

export function registerPluginsIpc() {
  ipcMain.handle('codex:plugins:list', () => getPlugins())

  ipcMain.handle('codex:plugins:save', (_event, store) => savePlugins(store))

  ipcMain.handle('codex:plugins:import', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win, {
      title: '选择资源（.assterplugin）',
      buttonLabel: '导入',
      filters: [{ name: 'Asster 插件资源', extensions: ['assterplugin'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { ...EMPTY_REPORT }
    }

    const filePath = result.filePaths[0]
    try {
      const dir = decryptToHiddenFolder(filePath)
      return importFromDirectory(dir)
    } catch (error) {
      return {
        canceled: false,
        importedAgents: [],
        importedSkills: [],
        errors: [
          {
            file: path.basename(filePath),
            reason: `解密失败：${error?.message ?? '未知错误'}`,
          },
        ],
        ignored: [],
      }
    }
  })
}
