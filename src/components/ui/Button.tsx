import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset] hover:bg-accent-soft active:bg-accent-deep',
  secondary:
    'bg-ink-700 text-fg border border-ink-600 hover:bg-ink-600 hover:border-ink-500',
  ghost: 'text-fg-muted hover:text-fg hover:bg-ink-800',
  outline:
    'border border-ink-600 text-fg-muted hover:text-fg hover:border-ink-500 hover:bg-ink-800',
  danger:
    'border border-bad/30 bg-bad/10 text-bad hover:bg-bad/20 hover:border-bad/50',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12.5px]',
  md: 'h-9 px-3.5 text-[13px]',
  lg: 'h-11 px-5 text-sm',
  icon: 'h-8 w-8',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950',
        'disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
})
