import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { Fragment } from 'react'
import { cn } from '@/lib/utils'

export interface Crumb {
  label: string
  to?: string
}

/** Trilha "Início / Mercado / …" dos frames desktop. */
export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Você está em" className={cn('text-body-lg font-bold', className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 && (
              <li aria-hidden className="text-text-secondary">
                /
              </li>
            )}
            <li>
              {item.to && i < items.length - 1 ? (
                <Link to={item.to} className="hover:text-primary">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}

/** Barra superior das telas mobile (voltar + título + ação). */
export function MobileTopBar({
  title,
  action,
  fallback = '/',
  className,
}: {
  title?: string
  action?: React.ReactNode
  fallback?: string
  className?: string
}) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <div className={cn('flex items-center justify-between gap-3 py-3 md:hidden', className)}>
      <button
        type="button"
        onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: fallback }))}
        aria-label="Voltar"
        className="grid size-9 place-items-center rounded-full bg-surface-raised text-primary"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      {title && <h1 className="flex-1 text-center text-title font-bold">{title}</h1>}
      <div className="grid min-w-9 place-items-center">{action}</div>
    </div>
  )
}
