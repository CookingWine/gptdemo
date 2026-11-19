import { memo, useState } from 'react'
import { Check, Copy, Terminal, TriangleAlert } from 'lucide-react'
import type { ChatMessage } from '../../types'
import { cn, formatClock } from '../../lib/utils'
import { Markdown } from './Markdown'

export const MessageItem = memo(function MessageItem({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard
      .writeText(message.content)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      })
      .catch((error) => console.error('[message] copy failed:', error))
  }

  if (message.role === 'user') {
    return (
      <div className="flex animate-fade-up justify-end">
        <div className="max-w-[82%] rounded-2xl rounded-br-md border border-ink-600 bg-ink-700/60 px-4 py-2.5 text-[13.5px] leading-relaxed text-fg whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    )
  }

  const showThinking = message.streaming && message.content.length === 0

  return (
    <div className="group/message flex animate-fade-up gap-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-accent/25 bg-gradient-to-br from-accent/25 to-accent-deep/10 text-accent-soft">
        <Terminal size={13} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-[12.5px] font-semibold text-fg">Codex</span>
          {message.modelLabel ? (
            <span className="rounded border border-ink-600 bg-ink-800 px-1.5 py-px font-mono text-[10.5px] text-fg-dim">
              {message.modelLabel}
            </span>
          ) : null}
          {message.mock ? (
            <span className="rounded border border-warn/25 bg-warn/10 px-1.5 py-px text-[10.5px] text-warn">
              本地演示
            </span>
          ) : null}
          <span className="text-[10.5px] text-fg-dim">{formatClock(message.createdAt)}</span>
          {message.content ? (
            <button
              type="button"
              onClick={copy}
              className={cn(
                'ml-auto flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] opacity-0 transition-all duration-150 hover:bg-ink-700 group-hover/message:opacity-100',
                copied ? 'text-ok' : 'text-fg-dim hover:text-fg-secondary',
              )}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? '已复制' : '复制'}
            </button>
          ) : null}
        </div>

        {showThinking ? (
          <div className="flex items-center gap-2 py-1 text-[12.5px] text-fg-dim">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent/80" />
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent/60 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent/40 [animation-delay:300ms]" />
            </span>
            正在生成…
          </div>
        ) : (
          <Markdown content={message.content} />
        )}

        {message.streaming && message.content.length > 0 ? (
          <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-[2px] animate-blink bg-accent" />
        ) : null}

        {message.error ? (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-bad/25 bg-bad/10 px-3 py-2 text-[12px] leading-relaxed text-bad">
            <TriangleAlert size={13} className="mt-0.5 shrink-0" />
            <span>{message.error}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
})
