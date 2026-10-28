import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  /** Nome do item, para os rótulos acessíveis ("Diminuir quantidade de X"). */
  label: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  disabled,
  size = 'md',
  className,
}: QuantityStepperProps) {
  const button = cn(
    'grid shrink-0 place-items-center rounded-full bg-primary text-ink transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-text-secondary',
    size === 'sm' ? 'size-5' : 'size-7',
  )
  return (
    <div
      role="group"
      aria-label={`Quantidade de ${label}`}
      className={cn('flex items-center gap-2', className)}
    >
      <button
        type="button"
        className={button}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label={`Diminuir quantidade de ${label}`}
      >
        <Minus className={size === 'sm' ? 'size-3' : 'size-4'} aria-hidden />
      </button>
      <output aria-live="polite" className="min-w-5 text-center text-body-lg tabular-nums">
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label={`Aumentar quantidade de ${label}`}
      >
        <Plus className={size === 'sm' ? 'size-3' : 'size-4'} aria-hidden />
      </button>
    </div>
  )
}
