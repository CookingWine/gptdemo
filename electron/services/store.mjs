import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_PROVIDERS = [
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    temperature: 0.7,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    temperature: 0.7,
  },
]

const DEFAULT_SETTINGS = {
  activeModelId: '',
  activeAgentId: '',
  models: [],
  providers: [],
}

function dataDir() {
  return app.getPath('userData')
}

function filePath(name) {
  return path.join(dataDir(), name)
}

function readJson(name, fallback) {
  try {
    const raw = fs.readFileSync(filePath(name), 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.error(`[store] failed to read ${name}:`, error?.message ?? error)
    }
    return fallback
  }
}

function writeJson(name, value) {
  const target = filePath(name)
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true })
    const tmp = `${target}.${process.pid}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
    fs.renameSync(tmp, target)
  } catch (error) {
    console.error(`[store] failed to write ${name}:`, error?.message ?? error)
  }
}

function encryptKey(plain) {
  if (!plain) return { apiKey: '', encrypted: false }
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return { apiKey: safeStorage.encryptString(plain).toString('base64'), encrypted: true }
    }
  } catch (error) {
    console.error('[store] safeStorage unavailable:', error?.message ?? error)
  }
  return { apiKey: plain, encrypted: false }
}

function decryptKey(stored, encrypted) {
  if (!stored) return ''
  if (!encrypted) return stored
  try {
    return safeStorage.decryptString(Buffer.from(stored, 'base64'))
  } catch (error) {
    console.error('[store] failed to decrypt api key:', error?.message ?? error)
    return ''
  }
}

function clampTemperature(value, fallback) {
  return Number.isFinite(value) ? Math.min(2, Math.max(0, value)) : fallback
}

function readProvider(raw, preset) {
  const stored = raw && typeof raw === 'object' ? raw : {}
  return {
    id: preset.id,
    label: preset.label,
    baseUrl:
      typeof stored.baseUrl === 'string' && stored.baseUrl.trim()
        ? stored.baseUrl.trim()
        : preset.baseUrl,
    temperature: clampTemperature(stored.temperature, preset.temperature),
    apiKey: decryptKey(
      typeof stored.apiKey === 'string' ? stored.apiKey : '',
      Boolean(stored.encrypted),
    ),
  }
}

/**
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function getSettings() {
  const raw = readJson('settings.json', null)
  const storedProviders = Array.isArray(raw?.providers) ? raw.providers : []
  const legacyApi = raw?.api && typeof raw.api === 'object' ? raw.api : null

  // Migration: older builds stored a single `api` object; expose it as the OpenAI provider.
  const providers = DEFAULT_PROVIDERS.map((preset, index) => {
    const stored = storedProviders.find((provider) => provider?.id === preset.id)
    if (stored) return readProvider(stored, preset)
    if (index === 0 && legacyApi) return readProvider(legacyApi, preset)
    return readProvider(null, preset)
  })

  return {
    activeModelId: typeof raw?.activeModelId === 'string' ? raw.activeModelId : '',
    activeAgentId: typeof raw?.activeAgentId === 'string' ? raw.activeAgentId : '',
    models: Array.isArray(raw?.models) ? raw.models : [],
    providers,
  }
}

/**
 * Merge a partial update into the persisted settings and return the new full settings.
 * @param {Record<string, unknown>} patch
 */
export function saveSettings(patch) {
  const current = getSettings()
  const incoming = Array.isArray(patch?.providers) ? patch.providers : current.providers
  const models = Array.isArray(patch?.models) ? patch.models : current.models
  const activeModelId =
    typeof patch?.activeModelId === 'string' ? patch.activeModelId : current.activeModelId
  const activeAgentId =
    typeof patch?.activeAgentId === 'string' ? patch.activeAgentId : current.activeAgentId

  const providers = DEFAULT_PROVIDERS.map((preset) => {
    const next =
      incoming.find((provider) => provider?.id === preset.id) ??
      current.providers.find((provider) => provider.id === preset.id) ??
      preset
    const encryptedKey = encryptKey(typeof next.apiKey === 'string' ? next.apiKey.trim() : '')
    return {
      id: preset.id,
      label: preset.label,
      baseUrl:
        typeof next.baseUrl === 'string' && next.baseUrl.trim()
          ? next.baseUrl.trim()
          : preset.baseUrl,
      temperature: clampTemperature(next.temperature, preset.temperature),
      apiKey: encryptedKey.apiKey,
      encrypted: encryptedKey.encrypted,
    }
  })

  writeJson('settings.json', { activeModelId, activeAgentId, models, providers })
  return getSettings()
}

/**
 * @returns {Array<Record<string, unknown>>}
 */
export function listConversations() {
  const raw = readJson('conversations.json', [])
  return Array.isArray(raw) ? raw : []
}

/**
 * @param {Array<Record<string, unknown>>} list
 */
export function saveConversations(list) {
  const safe = Array.isArray(list) ? list.slice(0, 300) : []
  writeJson('conversations.json', safe)
  return { ok: true }
}

export function clearConversations() {
  writeJson('conversations.json', [])
  return { ok: true }
}
