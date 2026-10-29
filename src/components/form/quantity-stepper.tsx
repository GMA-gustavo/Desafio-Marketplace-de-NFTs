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
  /**
   * `lg`: pílulas de 33 × 49,5 px (Desktop / Detalhes do NFT);
   * `pill`: pílulas de 20 × 30 px (Desktop / Carrinho de NFTs);
   * `round`: círculos de 24 px com borda (Mobile / Carrinho de NFTs).
   */
  size?: 'sm' | 'md' | 'lg' | 'pill' | 'round'
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
    size === 'sm'
      ? 'size-5'
      : size === 'lg'
        ? 'h-[49.5px] w-[33px] text-black'
        : size === 'pill'
          ? 'h-[30px] w-5 text-black'
          : size === 'round'
            ? 'size-6 border border-border bg-surface-raised text-foreground hover:bg-surface-raised hover:text-primary'
            : 'size-7',
  )
  const icon =
    size === 'sm' ? 'size-3' : size === 'lg' ? 'size-[26px]' : size === 'pill' ? 'size-4' : 'size-4'
  return (
    <div
      role="group"
      aria-label={`Quantidade de ${label}`}
      className={cn(
        'flex items-center',
        size === 'lg' || size === 'pill' ? 'gap-3' : size === 'round' ? 'gap-2.5' : 'gap-2',
        className,
      )}
    >
      <button
        type="button"
        className={button}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label={`Diminuir quantidade de ${label}`}
      >
        <Minus className={icon} aria-hidden />
      </button>
      <output
        aria-live="polite"
        className={cn(
          'min-w-5 text-center tabular-nums',
          size === 'lg'
            ? 'text-title leading-7'
            : size === 'pill'
              ? 'text-[17px] leading-6'
              : 'text-body-lg',
        )}
      >
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label={`Aumentar quantidade de ${label}`}
      >
        <Plus className={icon} aria-hidden />
      </button>
    </div>
  )
}
