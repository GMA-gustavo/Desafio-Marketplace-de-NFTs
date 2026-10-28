import { cn } from '@/lib/utils'

/** Placeholder com shimmer; respeita prefers-reduced-motion via regra global em index.css. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--kurio-surface-card)_0%,var(--kurio-surface-raised)_40%,var(--kurio-border-soft)_50%,var(--kurio-surface-raised)_60%,var(--kurio-surface-card)_100%)] bg-size-[200%_100%]',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
