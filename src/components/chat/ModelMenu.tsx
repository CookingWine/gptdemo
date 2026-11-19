import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Cpu } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'
import { getProviderLabel } from '../../lib/constants'
import { cn } from '../../lib/utils'

export function ModelMenu() {
  const { settings, activeModel, setActiveModel } = useSettings()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] text-fg-muted transition-colors duration-150 hover:bg-ink-700 hover:text-fg',
          open && 'bg-ink-700 text-fg',
        )}
      >
        <Cpu size={12} className="text-accent/80" />
        <span className="max-w-[140px] truncate">{activeModel.label}</span>
        <ChevronDown size={11} className={cn('transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute bottom-full left-0 z-30 mb-2 w-[280px] animate-fade-up rounded-xl border border-ink-600 bg-ink-850/95 p-1.5 shadow-panel backdrop-blur"
        >
          <p className="px-2 pb-1.5 pt-1 text-[10.5px] uppercase tracking-[0.08em] text-fg-dim">
            选择模型
          </p>
          {settings.models.map((model) => {
            const selected = model.id === activeModel.id
            return (
              <button
                key={model.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setActiveModel(model.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-150',
                  selected ? 'bg-accent/10' : 'hover:bg-ink-700',
                )}
              >
                <span className="mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  {selected ? <Check size={12} className="text-accent" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] text-fg">{model.label}</span>
                    {!model.builtin ? (
                      <span className="rounded border border-ink-600 px-1 text-[9.5px] text-fg-dim">
                        自定义
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10.5px] text-fg-dim">
                    {getProviderLabel(settings.providers, model.providerId)} · {model.modelId}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
