import { ArrowUpRight, Cpu, Sparkles, Terminal } from 'lucide-react'
import { EXAMPLE_PROMPTS } from '../../lib/constants'
import { useSettings } from '../../hooks/useSettings'

export function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  const { activeModel, activeProvider, modelSwitchLocked, appConfig } = useSettings()
  const liveMode = Boolean(activeProvider.apiKey && activeProvider.baseUrl)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-6 py-10">
        <div className="animate-fade-up">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-ink-600 bg-gradient-to-br from-ink-750 to-ink-900 shadow-panel">
            <Terminal size={20} className="text-accent-soft" />
          </div>
          <h1 className="bg-gradient-to-br from-white via-fg to-fg-muted bg-clip-text text-[27px] font-semibold leading-tight tracking-[-0.02em] text-transparent">
            今天要构建什么？
          </h1>
          {appConfig.ui.showChatModel ? (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-fg-muted">
              当前由
              <span className="inline-flex items-center gap-1 rounded-md border border-ink-600 bg-ink-800 px-1.5 py-0.5 font-mono text-[11.5px] text-accent-soft">
                <Cpu size={11} />
                {activeModel.label}
              </span>
              驱动
              <span className="text-fg-dim">·</span>
              <span className={liveMode ? 'text-ok' : 'text-warn'}>
                {liveMode ? `${activeProvider.label} 已连接` : '本地演示模式'}
              </span>
            </p>
          ) : null}
        </div>

        <div className="mt-8 grid animate-fade-up grid-cols-1 gap-3 sm:grid-cols-2 [animation-delay:60ms]">
          {EXAMPLE_PROMPTS.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => onPick(item.prompt)}
              className="group cursor-pointer rounded-xl border border-ink-600 bg-ink-900/60 p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-ink-850 hover:shadow-panel"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12.5px] font-medium text-fg">{item.title}</span>
                <ArrowUpRight
                  size={13}
                  className="mt-0.5 shrink-0 text-fg-dim transition-colors group-hover:text-accent-soft"
                />
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-fg-dim">{item.subtitle}</p>
            </button>
          ))}
        </div>

        {appConfig.ui.showChatModel ? (
          <p className="mt-8 flex items-center gap-1.5 text-[11.5px] text-fg-dim">
            <Sparkles size={12} className="text-accent/70" />
            {modelSwitchLocked
              ? '当前版本已锁定模型，直接开始对话即可。'
              : '在设置中可切换模型或添加自定义模型，选择会立即作用于新的对话请求。'}
          </p>
        ) : null}
      </div>
    </div>
  )
}
