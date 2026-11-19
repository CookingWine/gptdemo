import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './Button'

export function Toast({
  message,
  onClose,
  duration = 5000,
}: {
  message: string
  onClose: () => void
  duration?: number
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onClose])

  return (
    <div className="pointer-events-auto fixed right-5 top-5 z-[60] w-[330px] animate-fade-up rounded-xl border border-warn/30 bg-ink-850/95 p-3.5 shadow-panel backdrop-blur">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warn/15 text-warn">
          <AlertTriangle size={12} />
        </span>
        <p className="flex-1 text-[12.5px] leading-relaxed text-fg-secondary">{message}</p>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose} aria-label="关闭提示">
          <X size={12} />
        </Button>
      </div>
    </div>
  )
}
