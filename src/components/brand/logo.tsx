import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn('text-body font-bold tracking-[0.12em] text-foreground', className)}
      aria-label="Kurio — página inicial"
    >
      KURIO
    </Link>
  )
}
