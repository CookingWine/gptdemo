import { useState } from 'react'
import { Check, Cpu, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'
import { getProviderLabel } from '../../lib/constants'
import { cn } from '../../lib/utils'
import type { ModelConfig } from '../../types'
import { ConfirmDialog } from '../ui/Modal'
import { CustomModelDialog } from './CustomModelDialog'

export function ModelsPanel() {
  const { settings, activeModel, activeProvider, setActiveModel, removeModel } = useSettings()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ModelConfig | null>(null)
  const liveMode = Boolean(activeProvider.apiKey && activeProvider.baseUrl)

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-[15px] font-semibold text-fg">模型</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
          选择用于新消息的模型。切换后，输入区标识与请求参数会立即同步；已生成的回复不受影响。
        </p>
      </header>

      <div className="relative overflow-hidden rounded-xl border border-ink-600 bg-gradient-to-br from-ink-800 via-ink-850 to-ink-900 p-4">
        <div className="pointer-events-none absolute -right-10 -top-16 h-36 w-36 rounded-full bg-accent/12 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.1em] text-fg-dim">
              <Sparkles size={11} className="text-accent-soft" />
              当前模型
            </p>
            <p className="mt-1.5 truncate text-[17px] font-semibold tracking-tight text-fg">
              {activeModel.label}
            </p>
            <p className="mt-0.5 truncate font-mono text-[11px] text-fg-dim">
              {getProviderLabel(settings.providers, activeModel.providerId)} · {activeModel.modelId}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-md border px-2 py-1 text-[10.5px]',
              liveMode
                ? 'border-ok/30 bg-ok/10 text-ok'
                : 'border-warn/30 bg-warn/10 text-warn',
            )}
          >
            {liveMode ? '真实 API' : '本地演示'}
          </span>
        </div>
      </div>

      <div className="space-y-2" role="radiogroup" aria-label="模型列表">
        {settings.models.map((model) => {
          const selected = model.id === activeModel.id
          return (
            <div
              key={model.id}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              onClick={() => setActiveModel(model.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setActiveModel(model.id)
                }
              }}
              className={cn(
                'group flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all duration-150',
                selected
                  ? 'border-accent/50 bg-accent/[0.06] shadow-[0_10px_30px_-18px_rgba(91,141,239,0.8)]'
                  : 'border-ink-600 bg-ink-900/50 hover:border-ink-500 hover:bg-ink-850',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                  selected ? 'border-accent bg-accent' : 'border-ink-500 bg-ink-900',
                )}
              >
                {selected ? <Check size={11} className="text-white" strokeWidth={3} /> : null}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] font-medium text-fg">{model.label}</span>
                  <span className="rounded border border-ink-600 bg-ink-800 px-1 py-px text-[9.5px] text-fg-secondary">
                    {getProviderLabel(settings.providers, model.providerId)}
                  </span>
                  {model.builtin ? (
                    <span className="rounded border border-ink-600 bg-ink-800 px-1 py-px text-[9.5px] text-fg-dim">
                      内置
                    </span>
                  ) : (
                    <span className="rounded border border-accent/30 bg-accent/10 px-1 py-px text-[9.5px] text-accent-soft">
                      自定义
                    </span>
                  )}
                  {(model.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-ink-700/70 px-1.5 py-px text-[9.5px] text-fg-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {model.description ? (
                  <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">
                    {model.description}
                  </p>
                ) : null}
                <p className="mt-1 truncate font-mono text-[10.5px] text-fg-dim">{model.modelId}</p>
              </div>

              {!model.builtin ? (
                <button
                  type="button"
                  aria-label="删除自定义模型"
                  onClick={(event) => {
                    event.stopPropagation()
                    setPendingDelete(model)
                  }}
                  className="mt-0.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded text-fg-dim opacity-0 transition-all duration-150 hover:bg-bad/15 hover:text-bad group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              ) : (
                <Cpu size={12} className="mt-1 text-fg-dim/60" />
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink-500 bg-ink-900/30 py-3 text-[12.5px] text-fg-muted transition-all duration-150 hover:border-accent/50 hover:bg-accent/[0.04] hover:text-fg"
      >
        <Plus size={13} className="text-accent-soft" />
        添加自定义模型
      </button>

      <p className="rounded-lg border border-ink-700/70 bg-ink-900/50 px-3 py-2.5 text-[11.5px] leading-relaxed text-fg-dim">
        自定义模型会被保存到本机配置中，请求时使用其「模型 ID」作为 {`model`} 参数，适用于任何
        OpenAI 兼容端点（如自建网关、Ollama、vLLM 等）。
      </p>

      <CustomModelDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="删除自定义模型"
        description={`删除「${pendingDelete?.label ?? ''}」后，若它正被使用将自动切换到列表中的第一个模型。`}
        confirmLabel="删除"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeModel(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
