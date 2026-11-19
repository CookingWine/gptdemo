import { Cpu, Settings2, Sparkles } from 'lucide-react'
import { useChat } from '../../hooks/useChat'
import { useSettings } from '../../hooks/useSettings'
import { formatRelative } from '../../lib/utils'
import { Button } from '../ui/Button'

export function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { activeConversation } = useChat()
  const { activeModel, activeProvider, modelSwitchLocked, appConfig } = useSettings()
  const liveMode = Boolean(activeProvider.apiKey && activeProvider.baseUrl)

  return (
    <header className="drag-region flex h-[54px] shrink-0 items-center justify-between gap-4 border-b border-ink-700/70 px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <h1 className="truncate text-[13px] font-medium text-fg">
          {activeConversation?.title ?? '新对话'}
        </h1>
        {activeConversation ? (
          <span className="shrink-0 text-[11px] text-fg-dim">
            {activeConversation.messages.length} 条消息 · {formatRelative(activeConversation.updatedAt)}
          </span>
        ) : (
          <span className="shrink-0 text-[11px] text-fg-dim">开始一段新的对话</span>
        )}
      </div>

      <div className="no-drag flex shrink-0 items-center gap-1.5">
        {appConfig.ui.showTopBarStatus ? (
          <>
            <span className="hidden items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-[10.5px] text-fg-dim md:flex">
              <Sparkles size={10} className={liveMode ? 'text-ok' : 'text-warn'} />
              {liveMode ? `${activeProvider.label} 已连接` : '未配置 Key'}
            </span>

            {modelSwitchLocked ? (
              <span
                title="模型已锁定"
                className="flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-[11.5px] text-fg-muted"
              >
                <Cpu size={11} className="text-accent-soft" />
                <span className="max-w-[150px] truncate font-mono">{activeModel.label}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-[11.5px] text-fg-muted transition-colors duration-150 hover:border-accent/40 hover:text-fg"
              >
                <Cpu size={11} className="text-accent-soft" />
                <span className="max-w-[150px] truncate font-mono">{activeModel.label}</span>
              </button>
            )}
          </>
        ) : null}

        <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="打开设置">
          <Settings2 size={14} />
        </Button>
      </div>
    </header>
  )
}
