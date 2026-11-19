import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

/** Keep in sync with DEFAULT_APP_CONFIG in src/lib/constants.ts */
const DEFAULT_APP_CONFIG = {
  allowModelSwitch: true,
  ui: {
    showSidebarStatus: false,
    showChatModel: false,
    showTopBarStatus: false,
    showSettingsNavHint: false,
    showRuntimeDetails: false,
    showLocalData: false,
    showAboutDetails: false,
  },
}

/** @type {typeof DEFAULT_APP_CONFIG | null} */
let cached = null

/**
 * Dev: <project>/config/app.config.json
 * Packaged: <App>.app/Contents/Resources/config/app.config.json (via extraResources)
 */
function configFilePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'config', 'app.config.json')
  }
  return path.join(app.getAppPath(), 'config', 'app.config.json')
}

/**
 * Reads the runtime config once per process. Never throws: invalid or missing
 * files fall back to "model switching allowed" so the app always starts.
 */
export function getAppConfig() {
  if (cached) return cached

  const file = configFilePath()
  const config = {
    ...DEFAULT_APP_CONFIG,
    ui: { ...DEFAULT_APP_CONFIG.ui },
    configPath: file,
    configFound: false,
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
    config.configFound = true
    if (typeof raw?.allowModelSwitch === 'boolean') {
      config.allowModelSwitch = raw.allowModelSwitch
    } else {
      console.error('[config] allowModelSwitch is missing or not a boolean, using default true')
    }

    // UI visibility is opt-in: anything other than `true` keeps the element hidden.
    const ui = raw?.ui && typeof raw.ui === 'object' ? raw.ui : {}
    config.ui = {
      showSidebarStatus: ui.showSidebarStatus === true,
      showChatModel: ui.showChatModel === true,
      showTopBarStatus: ui.showTopBarStatus === true,
      showSettingsNavHint: ui.showSettingsNavHint === true,
      showRuntimeDetails: ui.showRuntimeDetails === true,
      showLocalData: ui.showLocalData === true,
      showAboutDetails: ui.showAboutDetails === true,
    }

    console.log(
      `[config] loaded ${file} allowModelSwitch=${config.allowModelSwitch} ui=${JSON.stringify(config.ui)}`,
    )
  } catch (error) {
    console.error(`[config] failed to read ${file}:`, error?.message ?? error)
  }

  cached = config
  return cached
}
