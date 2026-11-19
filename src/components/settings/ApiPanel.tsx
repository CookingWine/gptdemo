import { useState } from 'react'
import { Check, Eye, EyeOff, Loader2, Lock, PlugZap, RotateCcw } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'
import { DEFAULT_PROVIDERS } from '../../lib/constants'
import { getBridge, isElectron } from '../../lib/ipc'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Field, Input, Slider } from '../ui/Form'

const PRESETS: Record<string, Array<{ label: string; baseUrl: string }>> = {
  openai: [
    { label: 'OpenAI 官方', baseUrl: 'https://api.openai.com/v1' },
    { label: '本地 Ollama', baseUrl: 'http://localhost:11434/v1' },
  ],
  deepseek: [
    { label: 'DeepSeek 官方', baseUrl: 'https://api.deepseek.com' },
    { label: '兼容 /v1', baseUrl: 'https://api.deepseek.com/v1' },
  ],
}

const FALLBACK_MODEL: Record<string, string> = {
  openai: 'gpt-5-codex',
  deepseek: 'deepseek-flash',
}

export function ApiPanel() {
  const { settings, activeModel, activeProvider, saveProvider } = useSettings()
  const [providerId, setProviderId] = useState(activeProvider.id)
  const provider = settings.providers.find((item) => item.id === providerId) ?? activeProvider

  const [baseUrl, setBaseUrl] = useState(provider.baseUrl)
  const [apiKey, setApiKey] = useState(provider.apiKey)
  const [temperature, setTemperature] = useState(provider.temperature)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [error, setError] = useState('')

  const draftApi = { baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), temperature }
  const presets = PRESETS[provider.id] ?? []
  const providerModels = settings.models.filter((model) => model.providerId === provider.id)
  const testModel = providerModels[0]?.modelId ?? FALLBACK_MODEL[provider.id] ?? activeModel.modelId

  const selectProvider = (id: string) => {
    if (id === provider.id) return
    const next = settings.providers.find((item) => item.id === id)
    if (!next) return
    setProviderId(next.id)
    setBaseUrl(next.baseUrl)
    setApiKey(next.apiKey)
    setTemperature(next.temperature)
    setTestResult(null)
    setError('')
    setShowKey(false)
  }

  const handleSave = () => {
    if (!/^https?:\/\//.test(draftApi.baseUrl)) {
      setError('Base URL 需以 http:// 或 https:// 开头')
      return
    }
    setError('')
    saveProvider(provider.id, draftApi)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = () => {
    if (testing) return
    setTesting(true)
    setTestResult(null)
    getBridge()
      .testConnection({ api: draftApi, model: testModel })
      .then((result) => {
        setTestResult({ ok: result.ok, message: result.message })
      })
      .catch((err) => {
        setTestResult({ ok: false, message: err?.message ?? '连接失败' })
      })
      .finally(() => setTesting(false))
  }

  const handleReset = () => {
    const preset = DEFAULT_PROVIDERS.find((item) => item.id === provider.id)
    setBaseUrl(preset?.baseUrl ?? provider.baseUrl)
    setApiKey('')
    setTemperature(preset?.temperature ?? 0.7)
    setTestResult(null)
    setError('')
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-[15px] font-semibold text-fg">API 连接</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
          每个供应商独立保存 Base URL、密钥与温度。对话时按所选模型自动使用对应通道；仅配置了
          Key 的通道才会发起真实请求。
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="供应商">
        {settings.providers.map((item) => {
          const selected = item.id === provider.id
          const inUse = item.id === activeModel.providerId
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectProvider(item.id)}
              className={cn(
                'flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-all duration-150',
                selected
                  ? 'border-accent/50 bg-accent/[0.07] shadow-[0_10px_28px_-20px_rgba(91,141,239,0.9)]'
                  : 'border-ink-600 bg-ink-900/50 hover:border-ink-500 hover:bg-ink-850',
              )}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    item.apiKey ? 'bg-ok shadow-[0_0_6px_rgba(63,185,80,0.7)]' : 'bg-ink-500',
                  )}
                />
                <span className="text-[12.5px] font-medium text-fg">{item.label}</span>
                {inUse ? (
                  <span className="ml-auto rounded bg-ink-700/80 px-1 py-px text-[9.5px] text-fg-muted">
                    当前模型
                  </span>
                ) : null}
              </span>
              <span className="truncate font-mono text-[10px] text-fg-dim">
                {item.apiKey ? '已配置 Key' : '未配置 Key'}
              </span>
            </button>
          )
        })}
      </div>

      <section className="space-y-4 rounded-xl border border-ink-600 bg-ink-900/50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[12.5px] font-medium text-fg">{provider.label} 通道</h3>
          <span className="text-[10.5px] text-fg-dim">{providerModels.length} 个可用模型</span>
        </div>

        <Field label="Base URL" hint="不含 /chat/completions">
          <Input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder={provider.id === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1'}
            className="font-mono text-[12px]"
          />
        </Field>

        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setBaseUrl(preset.baseUrl)}
              className={cn(
                'cursor-pointer rounded-md border px-2 py-1 text-[10.5px] transition-colors duration-150',
                baseUrl === preset.baseUrl
                  ? 'border-accent/50 bg-accent/10 text-accent-soft'
                  : 'border-ink-600 text-fg-dim hover:border-ink-500 hover:text-fg-secondary',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <Field label="API Key" hint="仅保存在本机">
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              className="pr-9 font-mono text-[12px]"
            />
            <button
              type="button"
              onClick={() => setShowKey((value) => !value)}
              aria-label={showKey ? '隐藏密钥' : '显示密钥'}
              className="absolute right-1 top-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded text-fg-dim hover:bg-ink-700 hover:text-fg-secondary"
            >
              {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </Field>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[12.5px] font-medium text-fg">温度</span>
            <span className="font-mono text-[11.5px] text-accent-soft">{temperature.toFixed(1)}</span>
          </div>
          <Slider value={temperature} onChange={setTemperature} />
          <p className="text-[10.5px] text-fg-dim">
            数值越低输出越稳定，越高越发散。代码类任务建议 0.2 - 0.5。
          </p>
        </div>

        {error ? <p className="text-[11.5px] text-bad">{error}</p> : null}

        <div className="flex items-center gap-2 pt-1">
          <Button variant="primary" size="sm" onClick={handleSave}>
            {saved ? <Check size={12} /> : null}
            {saved ? '已保存' : '保存配置'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 size={12} className="animate-spin" /> : <PlugZap size={12} />}
            {testing ? '测试中…' : '测试连接'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} className="ml-auto">
            <RotateCcw size={11} />
            重置
          </Button>
        </div>

        {testResult ? (
          <div
            className={cn(
              'flex items-start gap-2 rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed',
              testResult.ok ? 'border-ok/30 bg-ok/10 text-ok' : 'border-bad/30 bg-bad/10 text-bad',
            )}
          >
            <span className="mt-0.5 flex h-3.5 w-3.5 items-center justify-center">
              {testResult.ok ? <Check size={12} /> : <Lock size={11} />}
            </span>
            <span>{testResult.message}</span>
          </div>
        ) : null}

        <p className="text-[10.5px] leading-relaxed text-fg-dim">
          测试使用该通道下的 {testModel} 发起一次最小请求，不会写入对话记录。
        </p>
      </section>

      <section className="rounded-xl border border-ink-700/70 bg-ink-900/40 p-4">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg">
          <Lock size={12} className="text-fg-dim" />
          安全说明
        </h3>
        <ul className="mt-2 space-y-1 text-[11.5px] leading-relaxed text-fg-dim">
          <li>· 每条通道的 API Key 独立加密保存（Electron safeStorage），互不覆盖；</li>
          <li>· 请求由主进程发起，渲染层无法直接访问密钥原文；</li>
          <li>
            · DeepSeek 使用 OpenAI 兼容协议，官方端点为 {`https://api.deepseek.com`}；
          </li>
          <li>
            · 当前运行环境：{isElectron() ? 'Electron 桌面端' : '浏览器预览（模拟连接）'}。
          </li>
        </ul>
      </section>
    </div>
  )
}
