export interface AppConfigUi {
  /** Left-bottom connection status in the sidebar. */
  showSidebarStatus: boolean
  /** Model selector / read-only model label in the composer, plus the empty-state model line. */
  showChatModel: boolean
  /** Connection status and current model name in the top-right corner. */
  showTopBarStatus: boolean
  /** Privacy note in the settings sidebar ("模型与 API 配置仅保存在本机…"). */
  showSettingsNavHint: boolean
  /** Extra runtime rows: connection mode, model, config path, provider keys. */
  showRuntimeDetails: boolean
  /** "本地数据" card, including the clear-all-sessions action. */
  showLocalData: boolean
  /** Extra about rows: tech stack, UI reference, description and back button. */
  showAboutDetails: boolean
}

export interface AppConfig {
  allowModelSwitch: boolean
  ui: AppConfigUi
  /** Absolute path of the config file actually read (undefined when unavailable). */
  configPath?: string
  configFound?: boolean
}

export interface ProviderConfig {
  id: string
  label: string
  baseUrl: string
  apiKey: string
  temperature: number
}

export interface ModelConfig {
  id: string
  label: string
  modelId: string
  providerId: string
  description?: string
  tags?: string[]
  builtin: boolean
}

export interface ApiConfig {
  baseUrl: string
  apiKey: string
  temperature: number
}

export interface PluginAgent {
  id: string
  name: string
  description?: string
  systemPrompt: string
  tags?: string[]
  builtin: boolean
}

export interface PluginSkill {
  id: string
  name: string
  description?: string
  instructions: string
  enabled: boolean
  tags?: string[]
}

export interface PluginsStore {
  agents: PluginAgent[]
  skills: PluginSkill[]
}

export interface PluginImportError {
  file: string
  reason: string
}

export interface PluginImportReport {
  canceled?: boolean
  importedAgents: PluginAgent[]
  importedSkills: PluginSkill[]
  errors: PluginImportError[]
  ignored: string[]
  store: PluginsStore
}

export interface AppSettings {
  activeModelId: string
  activeAgentId: string
  models: ModelConfig[]
  providers: ProviderConfig[]
}

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: number
  modelLabel?: string
  mock?: boolean
  error?: string
  streaming?: boolean
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

export interface StartChatPayload {
  requestId: string
  model: string
  modelLabel: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  api: ApiConfig
}

export interface ChatChunkEvent {
  requestId: string
  type: 'chunk'
  delta: string
}

export interface ChatDoneEvent {
  requestId: string
  type: 'done'
  mode: 'live' | 'mock'
  aborted?: boolean
}

export interface ChatNoticeEvent {
  requestId: string
  type: 'notice'
  mode: 'mock'
  message: string
}

export interface ChatResetEvent {
  requestId: string
  type: 'reset'
}

export interface ChatErrorEvent {
  requestId: string
  type: 'error'
  message: string
}

export type ChatEvent =
  | ChatChunkEvent
  | ChatDoneEvent
  | ChatNoticeEvent
  | ChatResetEvent
  | ChatErrorEvent

export interface TestConnectionResult {
  ok: boolean
  message: string
  latencyMs?: number
}

export interface StartChatResult {
  mode: 'live' | 'mock' | 'error'
  message?: string
}

export interface CodexBridge {
  platform: string
  versions: { electron: string; chrome: string; node: string }
  getAppConfig(): Promise<AppConfig>
  getSettings(): Promise<AppSettings>
  listPlugins(): Promise<PluginsStore>
  savePlugins(store: PluginsStore): Promise<PluginsStore>
  importPlugins(): Promise<PluginImportReport>
  saveSettings(patch: Partial<AppSettings>): Promise<AppSettings>
  listConversations(): Promise<Conversation[]>
  saveConversations(list: Conversation[]): Promise<{ ok: boolean }>
  clearConversations(): Promise<{ ok: boolean }>
  startChat(payload: StartChatPayload): Promise<StartChatResult>
  abortChat(requestId: string): Promise<{ ok: boolean }>
  testConnection(payload: { api: ApiConfig; model: string }): Promise<TestConnectionResult>
  onChatEvent(callback: (event: ChatEvent) => void): () => void
  onSettingsChanged(callback: (settings: AppSettings) => void): () => void
}

declare global {
  interface Window {
    codex?: CodexBridge
  }
}
