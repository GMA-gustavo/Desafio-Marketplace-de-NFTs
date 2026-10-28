import { X } from 'lucide-react'
import { useId, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Quote } from '@/contracts/cart'
import { toApiError } from '@/lib/api-error'
import { eth, formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useCoupon } from './use-cart-mutations'

/** Resumo de valores — sempre a partir da cotação da API (nunca recalculado no cliente). */
export function QuoteSummary({
  quote,
  isLoading,
  className,
}: {
  quote: Quote | undefined
  isLoading: boolean
  className?: string
}) {
  if (isLoading || !quote) {
    return (
      <div className={cn('space-y-3', className)} aria-busy="true">
        <span className="sr-only" role="status">
          Calculando valores…
        </span>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
    )
  }

  const hasDiscount = !eth.isZero(quote.discount)
  return (
    <dl className={cn('space-y-2 text-body', className)}>
      <div className="flex justify-between gap-3">
        <dt>Subtotal</dt>
        <dd className="whitespace-nowrap tabular-nums">{formatEth(quote.subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt>Desconto do lançamento</dt>
        <dd className={cn('whitespace-nowrap tabular-nums', hasDiscount && 'text-success')}>
          (-) {formatEth(quote.discount)}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt>Taxa de rede</dt>
        <dd className="text-right whitespace-nowrap tabular-nums">
          {formatEth(quote.networkFee)}
          <span className="block text-tiny text-primary">Taxa estimada</span>
        </dd>
      </div>
      <div className="flex justify-between gap-3 border-t border-border pt-4 font-bold">
        <dt>Total</dt>
        <dd className="text-title whitespace-nowrap text-primary tabular-nums" aria-live="polite">
          {formatEth(quote.total)}
        </dd>
      </div>
    </dl>
  )
}

export function CouponForm({
  couponCode,
  quote,
  variant = 'desktop',
}: {
  couponCode: string | null
  quote: Quote | undefined
  variant?: 'desktop' | 'mobile'
}) {
  const id = useId()
  const [code, setCode] = useState('')
  const { apply, remove } = useCoupon()
  const apiError = apply.error ? toApiError(apply.error) : null
  const error = apiError ? (apiError.fieldErrors.code ?? apiError.message) : null

  if (couponCode) {
    const status = quote?.coupon?.status
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 rounded-sm border border-primary/60 bg-primary/10 px-3 py-2">
          <p className="text-body">
            Cupom <strong>{couponCode}</strong>
            {quote?.coupon?.status === 'applied' && (
              <span className="text-text-secondary"> · {quote.coupon.description}</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
            aria-label={`Remover cupom ${couponCode}`}
            className="grid size-6 place-items-center rounded-full hover:bg-primary/20"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {status && status !== 'applied' && (
          <p role="alert" className="text-caption text-destructive">
            {status === 'expired'
              ? 'Este cupom expirou e não será aplicado.'
              : 'Este cupom não é mais válido.'}
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!code.trim()) return
        apply.mutate(code.trim(), { onSuccess: () => setCode('') })
      }}
      className="space-y-1.5"
    >
      <label htmlFor={id} className={cn('text-body font-bold', variant === 'mobile' && 'sr-only')}>
        Código promocional
      </label>
      <div
        className={cn(
          'flex',
          variant === 'mobile' && 'rounded-full border border-border-soft bg-surface-raised p-1',
        )}
      >
        <input
          id={id}
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            if (apply.isError) apply.reset()
          }}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'h-8 min-w-0 flex-1 bg-transparent px-2 text-caption placeholder:text-text-secondary',
            variant === 'desktop' && 'rounded-l-sm border border-r-0 border-border-soft',
          )}
        />
        <button
          type="submit"
          disabled={apply.isPending || !code.trim()}
          className={cn(
            'h-8 bg-primary px-4 text-body font-bold text-ink hover:bg-primary-light disabled:opacity-60',
            variant === 'desktop' ? 'rounded-r-sm' : 'rounded-full',
          )}
        >
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-caption text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
