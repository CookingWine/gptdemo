import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  ApiConfig,
  AppConfig,
  AppSettings,
  ModelConfig,
  PluginImportReport,
  PluginsStore,
  ProviderConfig,
} from '../types'
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_SETTINGS,
  LOCKED_MODEL_ID,
  PROVIDER_DEEPSEEK,
  mergeProviders,
  normalizeModels,
} from '../lib/constants'
import { getBridge } from '../lib/ipc'
import { createId } from '../lib/utils'

export interface SettingsContextValue {
  settings: AppSettings
  appConfig: AppConfig
  ready: boolean
  modelSwitchLocked: boolean
  activeModel: ModelConfig
  activeProvider: ProviderConfig
  plugins: PluginsStore
  setActiveModel: (id: string) => void
  setActiveAgent: (id: string) => void
  addModel: (draft: Omit<ModelConfig, 'id' | 'builtin'>) => void
  removeModel: (id: string) => void
  saveProvider: (id: string, patch: Partial<ProviderConfig>) => void
  savePlugins: (store: PluginsStore) => void
  importPlugins: () => Promise<PluginImportReport>
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG)
  const [plugins, setPlugins] = useState<PluginsStore>({ agents: [], skills: [] })
  const [ready, setReady] = useState(false)
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS)
  const appConfigRef = useRef<AppConfig>(DEFAULT_APP_CONFIG)
  const bridge = getBridge()

  const commit = useCallback(
    (next: AppSettings) => {
      settingsRef.current = next
      setSettings(next)
      bridge
        .saveSettings(next)
        .then((saved) => {
          settingsRef.current = saved
          setSettings(saved)
        })
        .catch((error) => console.error('[settings] save failed:', error))
    },
    [bridge],
  )

  useEffect(() => {
    let cancelled = false

    const configPromise =
      typeof bridge.getAppConfig === 'function'
        ? bridge.getAppConfig()
        : Promise.resolve(DEFAULT_APP_CONFIG)
    const pluginsPromise =
      typeof bridge.listPlugins === 'function'
        ? bridge.listPlugins()
        : Promise.resolve({ agents: [], skills: [] })

    Promise.all([
      bridge.getSettings(),
      configPromise.catch((error) => {
        console.error('[settings] app config load failed:', error)
        return DEFAULT_APP_CONFIG
      }),
      pluginsPromise.catch((error) => {
        console.error('[settings] plugins load failed:', error)
        return { agents: [], skills: [] }
      }),
    ])
      .then(([loaded, config, loadedPlugins]) => {
        if (cancelled) return
        const safeConfig: AppConfig = {
          allowModelSwitch: config?.allowModelSwitch !== false,
          ui: {
            showSidebarStatus: config?.ui?.showSidebarStatus === true,
            showChatModel: config?.ui?.showChatModel === true,
            showTopBarStatus: config?.ui?.showTopBarStatus === true,
            showSettingsNavHint: config?.ui?.showSettingsNavHint === true,
            showRuntimeDetails: config?.ui?.showRuntimeDetails === true,
            showLocalData: config?.ui?.showLocalData === true,
            showAboutDetails: config?.ui?.showAboutDetails === true,
          },
          configPath: config?.configPath,
          configFound: config?.configFound,
        }
        const locked = !safeConfig.allowModelSwitch
        const legacyApi = (loaded as AppSettings & { api?: ApiConfig }).api
        const models = normalizeModels(loaded.models)
        const providers = mergeProviders(loaded.providers, legacyApi)
        const activeModelId = models.some((model) => model.id === loaded.activeModelId)
          ? loaded.activeModelId
          : models[0].id
        const merged: AppSettings = {
          activeModelId,
          activeAgentId: typeof loaded.activeAgentId === 'string' ? loaded.activeAgentId : '',
          models,
          providers,
        }

        settingsRef.current = merged
        setSettings(merged)
        appConfigRef.current = safeConfig
        setAppConfig(safeConfig)
        setPlugins(loadedPlugins)
        setReady(true)

        const storedModels = loaded.models ?? []
        const storedProviders = loaded.providers ?? []
        const needsPersist =
          storedModels.length === 0 ||
          storedProviders.length === 0 ||
          storedModels.length !== models.length ||
          storedModels.some((model) => !model.providerId) ||
          (!locked && loaded.activeModelId !== activeModelId) ||
          !storedProviders.every((provider) => providers.some((next) => next.id === provider.id))

        if (needsPersist) {
          bridge
            .saveSettings({
              ...merged,
              // Never overwrite the user's saved choice while the switcher is locked.
              activeModelId: locked ? loaded.activeModelId || '' : activeModelId,
            })
            .then((saved) => {
              if (cancelled) return
              settingsRef.current = saved
              setSettings(saved)
            })
            .catch((error) => console.error('[settings] migrate failed:', error))
        }
      })
      .catch((error) => {
        console.error('[settings] load failed:', error)
        if (!cancelled) setReady(true)
      })

    const unsubscribe = bridge.onSettingsChanged((next) => {
      const models = normalizeModels(next.models)
      const providers = mergeProviders(next.providers)
      const activeModelId = models.some((model) => model.id === next.activeModelId)
        ? next.activeModelId
        : models[0].id
      const normalized: AppSettings = {
        activeModelId,
        activeAgentId: typeof next.activeAgentId === 'string' ? next.activeAgentId : '',
        models,
        providers,
      }
      settingsRef.current = normalized
      setSettings(normalized)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [bridge])

  const activeModel = useMemo(() => {
    const models = settings.models.length ? settings.models : DEFAULT_SETTINGS.models
    if (!appConfig.allowModelSwitch) {
      return (
        models.find((model) => model.id === LOCKED_MODEL_ID) ??
        models.find((model) => model.providerId === PROVIDER_DEEPSEEK) ??
        models[0]
      )
    }
    return models.find((model) => model.id === settings.activeModelId) ?? models[0]
  }, [settings.models, settings.activeModelId, appConfig.allowModelSwitch])

  const activeProvider = useMemo(() => {
    const providers = settings.providers.length ? settings.providers : DEFAULT_SETTINGS.providers
    return (
      providers.find((provider) => provider.id === activeModel.providerId) ?? providers[0]
    )
  }, [settings.providers, activeModel.providerId])

  const setActiveModel = useCallback(
    (id: string) => {
      if (!appConfigRef.current.allowModelSwitch) return
      if (!settingsRef.current.models.some((model) => model.id === id)) return
      commit({ ...settingsRef.current, activeModelId: id })
    },
    [commit],
  )

  const addModel = useCallback(
    (draft: Omit<ModelConfig, 'id' | 'builtin'>) => {
      if (!appConfigRef.current.allowModelSwitch) return
      const model: ModelConfig = {
        ...draft,
        id: createId('model'),
        builtin: false,
      }
      commit({
        ...settingsRef.current,
        models: [...settingsRef.current.models, model],
        activeModelId: model.id,
      })
    },
    [commit],
  )

  const removeModel = useCallback(
    (id: string) => {
      if (!appConfigRef.current.allowModelSwitch) return
      const current = settingsRef.current
      const target = current.models.find((model) => model.id === id)
      if (!target || target.builtin) return
      const models = current.models.filter((model) => model.id !== id)
      const activeModelId =
        current.activeModelId === id ? (models[0]?.id ?? '') : current.activeModelId
      commit({ ...current, models, activeModelId })
    },
    [commit],
  )

  const saveProvider = useCallback(
    (id: string, patch: Partial<ProviderConfig>) => {
      const current = settingsRef.current
      if (!current.providers.some((provider) => provider.id === id)) return
      const providers = current.providers.map((provider) =>
        provider.id === id
          ? {
              ...provider,
              ...patch,
              id: provider.id,
              label: provider.label,
              baseUrl: (patch.baseUrl ?? provider.baseUrl).trim(),
              apiKey: (patch.apiKey ?? provider.apiKey).trim(),
              temperature: Number.isFinite(patch.temperature)
                ? (patch.temperature as number)
                : provider.temperature,
            }
          : provider,
      )
      commit({ ...current, providers })
    },
    [commit],
  )

  const setActiveAgent = useCallback(
    (id: string) => {
      if (id && !plugins.agents.some((agent) => agent.id === id)) return
      commit({ ...settingsRef.current, activeAgentId: id })
    },
    [commit, plugins.agents],
  )

  const savePlugins = useCallback(
    (store: PluginsStore) => {
      if (typeof bridge.savePlugins !== 'function') return
      bridge
        .savePlugins(store)
        .then((saved) => setPlugins(saved))
        .catch((error) => console.error('[settings] save plugins failed:', error))
    },
    [bridge],
  )

  const importPlugins = useCallback((): Promise<PluginImportReport> => {
    if (typeof bridge.importPlugins !== 'function') {
      return Promise.resolve({
        canceled: false,
        importedAgents: [],
        importedSkills: [],
        errors: [{ file: '—', reason: '当前环境不支持导入插件' }],
        ignored: [],
        store: plugins,
      })
    }
    return bridge.importPlugins().then((report) => {
      if (!report.canceled && report.store) setPlugins(report.store)
      return report
    })
  }, [bridge, plugins])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      appConfig,
      ready,
      modelSwitchLocked: !appConfig.allowModelSwitch,
      activeModel,
      activeProvider,
      plugins,
      setActiveModel,
      setActiveAgent,
      addModel,
      removeModel,
      saveProvider,
      savePlugins,
      importPlugins,
    }),
    [
      settings,
      appConfig,
      ready,
      activeModel,
      activeProvider,
      plugins,
      setActiveModel,
      setActiveAgent,
      addModel,
      removeModel,
      saveProvider,
      savePlugins,
      importPlugins,
    ],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
