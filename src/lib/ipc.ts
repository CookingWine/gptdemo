import type { CodexBridge } from '../types'
import { browserBridge } from './browserBridge'

/** Returns the Electron bridge when available, otherwise the browser fallback. */
export function getBridge(): CodexBridge {
  return window.codex ?? browserBridge
}

export function isElectron() {
  return Boolean(window.codex)
}
