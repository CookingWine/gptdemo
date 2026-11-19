import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '../../lib/utils'

const CONTROL_BASE =
  'w-full rounded-lg border border-ink-600 bg-ink-900 text-[13px] text-fg placeholder:text-fg-dim outline-none transition-colors duration-150 hover:border-ink-500 focus:border-accent/60 focus:bg-ink-850 focus:ring-2 focus:ring-accent/15'

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="flex items-baseline justify-between">
        <span className="text-[12.5px] font-medium text-fg">{label}</span>
        {hint ? <span className="text-[11.5px] text-fg-dim">{hint}</span> : null}
      </span>
      {children}
      {error ? <span className="block text-[11.5px] text-bad">{error}</span> : null}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL_BASE, 'h-9 px-3', className)} {...props} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(CONTROL_BASE, 'px-3 py-2 leading-relaxed', className)} {...props} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(CONTROL_BASE, 'h-9 cursor-pointer px-2.5', className)} {...props}>
        {children}
      </select>
    )
  },
)

export function Slider({
  value,
  min = 0,
  max = 2,
  step = 0.1,
  onChange,
  id,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  id?: string
}) {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-600 accent-accent [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(91,141,239,0.15)]"
    />
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="text-[12.5px] text-fg-secondary">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-150',
          checked ? 'border-accent/60 bg-accent/80' : 'border-ink-600 bg-ink-700',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-150',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}
