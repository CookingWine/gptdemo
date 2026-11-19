import type { ApiConfig, AppConfig, AppSettings, ModelConfig, ProviderConfig } from '../types'

export const APP_NAME = 'Demo Client'
export const APP_VERSION = '0.1.0'
export const STORAGE_FALLBACK_KEY = 'codex.settings.fallback'

/** Model forced when the runtime config disables model switching. */
export const LOCKED_MODEL_ID = 'deepseek-flash'

/** Mirrors electron/services/appConfig.mjs; used when the config file is unavailable. */
export const DEFAULT_APP_CONFIG: AppConfig = {
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

export const PROVIDER_OPENAI = 'openai'
export const PROVIDER_DEEPSEEK = 'deepseek'

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: PROVIDER_OPENAI,
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    temperature: 0.7,
  },
  {
    id: PROVIDER_DEEPSEEK,
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    temperature: 0.7,
  },
]

export const BUILTIN_MODELS: ModelConfig[] = [
  {
    id: 'gpt-5-codex',
    label: 'GPT-5-Codex',
    modelId: 'gpt-5-codex',
    providerId: PROVIDER_OPENAI,
    description: '面向工程任务的代码专精模型，擅长长上下文重构、调试与多文件改动。',
    tags: ['代码', '长上下文'],
    builtin: true,
  },
  {
    id: 'gpt-5',
    label: 'GPT-5',
    modelId: 'gpt-5',
    providerId: PROVIDER_OPENAI,
    description: '通用旗舰模型，在推理深度与响应速度之间取得平衡，适合大多数对话。',
    tags: ['通用', '推理'],
    builtin: true,
  },
  {
    id: 'gpt-5-mini',
    label: 'GPT-5 mini',
    modelId: 'gpt-5-mini',
    providerId: PROVIDER_OPENAI,
    description: '低延迟、低成本，适合日常问答、文案润色与轻量代码补全。',
    tags: ['快速', '轻量'],
    builtin: true,
  },
  {
    id: 'o4-mini',
    label: 'o4-mini',
    modelId: 'o4-mini',
    providerId: PROVIDER_OPENAI,
    description: '更长的内部推理链，适合算法设计、数学推导与复杂逻辑拆解。',
    tags: ['推理', '算法'],
    builtin: true,
  },
  {
    id: 'deepseek-flash',
    label: 'deepseek-V4.1-Flash',
    modelId: 'deepseek-flash',
    providerId: PROVIDER_DEEPSEEK,
    description:
      'DeepSeek 最新 Flash 系列（DeepSeek-V4.1-Flash-1017），低延迟、低成本，适合日常对话与快速代码任务。',
    tags: ['快速', '通用'],
    builtin: true,
  },
  {
    id: 'deepseek-chat',
    label: 'DeepSeek V3',
    modelId: 'deepseek-chat',
    providerId: PROVIDER_DEEPSEEK,
    description: 'DeepSeek 通用对话模型，中文表现稳定，长文本与代码任务性价比高。',
    tags: ['通用', '中文'],
    builtin: true,
  },
  {
    id: 'deepseek-reasoner',
    label: 'DeepSeek R1',
    modelId: 'deepseek-reasoner',
    providerId: PROVIDER_DEEPSEEK,
    description: 'DeepSeek 深度推理模型，适合算法推导、数学与复杂逻辑拆解，响应相对较慢。',
    tags: ['推理', '深度思考'],
    builtin: true,
  },
]

export const DEFAULT_SETTINGS: AppSettings = {
  activeModelId: BUILTIN_MODELS[0].id,
  activeAgentId: '',
  models: BUILTIN_MODELS,
  providers: DEFAULT_PROVIDERS,
}

export const DEFAULT_SYSTEM_PROMPT = [
  '你是 Codex，一名严谨的编码助手，运行在桌面客户端中。',
  '回答保持简洁、结构清晰，优先给出可执行的步骤与代码。',
  '涉及代码时使用 Markdown 代码块并标注语言。',
  '如果信息不足，先说明假设，再给出方案。',
].join('\n')

/**
 * Built-in models always come from code (so new providers show up after upgrade),
 * while user-created models are preserved and tagged with a provider.
 */
export function normalizeModels(stored?: ModelConfig[]): ModelConfig[] {
  const custom = (Array.isArray(stored) ? stored : [])
    .filter((model) => model && typeof model.id === 'string' && !model.builtin)
    .map((model) => ({
      ...model,
      providerId: model.providerId || PROVIDER_OPENAI,
      label: model.label || model.modelId,
      modelId: model.modelId || model.id,
    }))
  return [...BUILTIN_MODELS, ...custom]
}

/**
 * Ensures every built-in provider exists, preserving stored endpoints and keys.
 * Falls back to the legacy single `api` config for the OpenAI channel.
 */
export function mergeProviders(
  stored?: ProviderConfig[],
  legacyApi?: ApiConfig,
): ProviderConfig[] {
  const list = Array.isArray(stored) ? stored : []
  return DEFAULT_PROVIDERS.map((preset) => {
    const found = list.find((provider) => provider?.id === preset.id)
    if (found) {
      return {
        ...preset,
        baseUrl: found.baseUrl || preset.baseUrl,
        apiKey: found.apiKey ?? '',
        temperature: Number.isFinite(found.temperature) ? found.temperature : preset.temperature,
      }
    }
    if (!list.length && legacyApi && preset.id === PROVIDER_OPENAI) {
      return {
        ...preset,
        baseUrl: legacyApi.baseUrl || preset.baseUrl,
        apiKey: legacyApi.apiKey ?? '',
        temperature: Number.isFinite(legacyApi.temperature)
          ? legacyApi.temperature
          : preset.temperature,
      }
    }
    return { ...preset }
  })
}

export function getProviderLabel(providers: ProviderConfig[], providerId: string): string {
  return providers.find((provider) => provider.id === providerId)?.label ?? providerId
}

export interface ExamplePrompt {
  title: string
  subtitle: string
  prompt: string
}

export const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    title: '重构一段 React 组件',
    subtitle: '收敛状态、拆分渲染逻辑',
    prompt: '帮我重构一个体积过大的 React 组件，说明如何拆分状态与渲染逻辑。',
  },
  {
    title: '设计流式对话接口',
    subtitle: 'SSE、错误重试与取消',
    prompt: '设计一个支持流式输出、可取消、可重试的对话接口，需要考虑哪些边界情况？',
  },
  {
    title: '排查 Electron 白屏',
    subtitle: '定位 preload 与加载路径',
    prompt: 'Electron 应用打包后白屏，可能的原因有哪些？请给出排查顺序。',
  },
  {
    title: '写一份类型定义',
    subtitle: '模型配置与消息结构',
    prompt: '为多模型对话客户端设计 TypeScript 类型，包括模型配置、消息与设置。',
  },
]
