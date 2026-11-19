import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '../../lib/utils'

export function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      })
      .catch((error) => console.error('[code] copy failed:', error))
  }

  return (
    <div className="group/code my-3 overflow-hidden rounded-lg border border-ink-600 bg-ink-950">
      <div className="flex items-center justify-between border-b border-ink-700/80 bg-ink-900/60 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-dim">
          {language || 'text'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-colors duration-150',
            copied ? 'text-ok' : 'text-fg-dim hover:bg-ink-700 hover:text-fg-secondary',
          )}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="overflow-x-auto px-3.5 py-3 text-[12.5px] leading-[1.7]">
        <code className="font-mono text-fg-secondary">{code}</code>
      </pre>
    </div>
  )
}
