import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, Cpu, Square } from 'lucide-react'
import { useChat } from '../../hooks/useChat'
import { useSettings } from '../../hooks/useSettings'
import { cn } from '../../lib/utils'
import { ModelMenu } from './ModelMenu'

export function Composer({
  value,
  onChange,
  onSubmit,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  const { streaming, stopGeneration } = useChat()
  const { activeModel, modelSwitchLocked, appConfig } = useSettings()
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`
  }, [value])

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (!value.trim() || streaming) return
    onSubmit()
  }

  const canSend = value.trim().length > 0 && !streaming

  return (
    <div className="shrink-0 px-6 pb-4 pt-1">
      <div className="mx-auto w-full max-w-3xl">
        <div
          className={cn(
            'rounded-xl border bg-ink-850/80 p-2.5 shadow-panel backdrop-blur transition-all duration-200',
            focused ? 'border-accent/40 ring-1 ring-accent/15' : 'border-ink-600',
          )}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="输入消息，Enter 发送 · Shift+Enter 换行"
            className="max-h-[200px] w-full resize-none bg-transparent px-2 py-1.5 text-[13.5px] leading-relaxed text-fg outline-none placeholder:text-fg-dim"
          />
          <div className="mt-1 flex items-center justify-between gap-2 px-0.5">
            <div className="flex min-w-0 items-center gap-1">
              {appConfig.ui.showChatModel ? (
                modelSwitchLocked ? (
                  <span
                    className="flex items-center gap-1.5 px-2 py-1 text-[11.5px] text-fg-muted"
                    title="模型已锁定，无法切换"
                  >
                    <Cpu size={12} className="text-accent/80" />
                    <span className="max-w-[160px] truncate">{activeModel.label}</span>
                  </span>
                ) : (
                  <ModelMenu />
                )
              ) : null}
              {value.length > 0 ? (
                <span className="text-[10.5px] text-fg-dim">{value.length} 字</span>
              ) : null}
            </div>

            {streaming ? (
              <button
                type="button"
                onClick={stopGeneration}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-bad/30 bg-bad/10 px-2.5 py-1.5 text-[11.5px] text-bad transition-colors duration-150 hover:bg-bad/20"
              >
                <Square size={10} fill="currentColor" />
                停止
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSend}
                aria-label="发送消息"
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150',
                  canSend
                    ? 'cursor-pointer bg-accent text-white hover:bg-accent-soft active:bg-accent-deep'
                    : 'cursor-not-allowed bg-ink-700 text-fg-dim',
                )}
              >
                <ArrowUp size={14} />
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-center text-[10.5px] text-fg-dim">
          模型输出可能不准确，请自行校验关键代码与结论
        </p>
      </div>
    </div>
  )
}
