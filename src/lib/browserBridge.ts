import type {
  ApiConfig,
  AppSettings,
  ChatEvent,
  CodexBridge,
  Conversation,
  PluginImportReport,
  PluginsStore,
  StartChatPayload,
  TestConnectionResult,
} from '../types'
import * as appConfigJson from '../../config/app.config.json'
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_SETTINGS,
  STORAGE_FALLBACK_KEY,
  mergeProviders,
  normalizeModels,
} from './constants'

const CHAT_KEY = 'codex.conversations.fallback'
const PLUGINS_KEY = 'codex.plugins.fallback'

function readPlugins(): PluginsStore {
  try {
    const raw = localStorage.getItem(PLUGINS_KEY)
    if (!raw) return { agents: [], skills: [] }
    const parsed = JSON.parse(raw) as PluginsStore
    return {
      agents: Array.isArray(parsed.agents) ? parsed.agents : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    }
  } catch {
    return { agents: [], skills: [] }
  }
}

const listeners = new Set<(event: ChatEvent) => void>()
const settingsListeners = new Set<(settings: AppSettings) => void>()
const timers = new Map<string, number>()

function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_FALLBACK_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as AppSettings & { api?: ApiConfig }
    return {
      activeModelId: parsed.activeModelId || DEFAULT_SETTINGS.activeModelId,
      activeAgentId: parsed.activeAgentId || DEFAULT_SETTINGS.activeAgentId,
      models: normalizeModels(parsed.models),
      providers: mergeProviders(parsed.providers, parsed.api),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function emit(event: ChatEvent) {
  listeners.forEach((listener) => listener(event))
}

function mockAnswer(prompt: string) {
  const topic = prompt.slice(0, 50) || '你的问题'
  return `### 关于「${topic}」

当前运行在**浏览器预览模式**，未连接 Electron 主进程，因此返回内置示例回复。

- 真实请求在 Electron 主进程中执行，可规避 CORS 限制；
- 模型与端点由应用配置决定，锁定模式下固定使用指定模型；
- 未配置 API Key 时自动使用本地模拟流式回复。

\`\`\`ts
const model = settings.models.find((item) => item.id === settings.activeModelId)
await window.codex.startChat({ model: model?.modelId ?? 'gpt-5-codex', messages })
\`\`\`

在桌面端启动（npm run dev）并配置 API Key 后，即可获得真实模型输出。`
}

/**
 * Browser-only fallback so the UI stays fully usable outside Electron
 * (e.g. `npm run dev:web`). Persistence uses localStorage.
 */
export const browserBridge: CodexBridge = {
  platform: 'browser',
  versions: { electron: '-', chrome: '-', node: '-' },

  async listPlugins(): Promise<PluginsStore> {
    return readPlugins()
  },

  async savePlugins(store: PluginsStore): Promise<PluginsStore> {
    localStorage.setItem(PLUGINS_KEY, JSON.stringify(store))
    return store
  },

  async importPlugins(): Promise<PluginImportReport> {
    return {
      canceled: false,
      importedAgents: [],
      importedSkills: [],
      errors: [
        {
          file: '—',
          reason: '浏览器预览不支持本地文件夹导入，请在桌面端使用该功能',
        },
      ],
      ignored: [],
      store: readPlugins(),
    }
  },

  async getAppConfig() {
    // Browser preview has no runtime file access, so the JSON is bundled at build time.
    const ui = appConfigJson.ui ?? DEFAULT_APP_CONFIG.ui
    return {
      allowModelSwitch:
        typeof appConfigJson.allowModelSwitch === 'boolean'
          ? appConfigJson.allowModelSwitch
          : DEFAULT_APP_CONFIG.allowModelSwitch,
      ui: {
        showSidebarStatus: ui.showSidebarStatus === true,
        showChatModel: ui.showChatModel === true,
        showTopBarStatus: ui.showTopBarStatus === true,
        showSettingsNavHint: ui.showSettingsNavHint === true,
        showRuntimeDetails: ui.showRuntimeDetails === true,
        showLocalData: ui.showLocalData === true,
        showAboutDetails: ui.showAboutDetails === true,
      },
      configPath: '浏览器预览：构建时内联 config/app.config.json',
      configFound: true,
    }
  },

  async getSettings() {
    return readSettings()
  },

  async saveSettings(patch) {
    const next = { ...readSettings(), ...patch }
    localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(next))
    settingsListeners.forEach((listener) => listener(next))
    return next
  },

  async listConversations() {
    try {
      const raw = localStorage.getItem(CHAT_KEY)
      return raw ? (JSON.parse(raw) as Conversation[]) : []
    } catch {
      return []
    }
  },

  async saveConversations(list) {
    localStorage.setItem(CHAT_KEY, JSON.stringify(list))
    return { ok: true }
  },

  async clearConversations() {
    localStorage.removeItem(CHAT_KEY)
    return { ok: true }
  },

  async startChat(payload: StartChatPayload) {
    const prompt = [...payload.messages].reverse().find((item) => item.role === 'user')?.content ?? ''
    const text = mockAnswer(prompt)
    const chars = Array.from(text)
    let index = 0

    const timer = window.setInterval(() => {
      const size = 2 + Math.floor(Math.random() * 3)
      emit({ requestId: payload.requestId, type: 'chunk', delta: chars.slice(index, index + size).join('') })
      index += size
      if (index >= chars.length) {
        window.clearInterval(timer)
        timers.delete(payload.requestId)
        emit({ requestId: payload.requestId, type: 'done', mode: 'mock' })
      }
    }, 26)
    timers.set(payload.requestId, timer)

    return { mode: 'mock' as const }
  },

  async abortChat(requestId) {
    const timer = timers.get(requestId)
    if (timer) {
      window.clearInterval(timer)
      timers.delete(requestId)
      emit({ requestId, type: 'done', mode: 'mock', aborted: true })
    }
    return { ok: true }
  },

  async testConnection(): Promise<TestConnectionResult> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return { ok: true, message: '浏览器预览模式：已模拟连接成功', latencyMs: 500 }
  },

  onChatEvent(callback) {
    listeners.add(callback)
    return () => listeners.delete(callback)
  },

  onSettingsChanged(callback) {
    settingsListeners.add(callback)
    return () => settingsListeners.delete(callback)
  },
}
