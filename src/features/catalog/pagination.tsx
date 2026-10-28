import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function pageList(current: number, total: number): (number | 'gap')[] {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? ['gap' as const, p] : [p]))
}

const itemClass =
  'grid size-7 place-items-center rounded-sm border border-border text-body transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40'

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-end">
      <ul className="flex items-center gap-2">
        <li>
          <button
            type="button"
            className={itemClass}
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
        </li>
        {pageList(page, totalPages).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-text-secondary">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => onChange(p)}
                aria-label={`Página ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  itemClass,
                  p === page && 'border-primary bg-primary font-bold text-ink hover:text-ink',
                )}
              >
                {p}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            className={itemClass}
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </li>
      </ul>
    </nav>
  )
}
