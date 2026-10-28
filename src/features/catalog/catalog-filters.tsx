import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { CatalogResponse } from '@/contracts/nft'
import { cn } from '@/lib/utils'
import { toggleValue, type CatalogSearch } from './catalog-search'

type Facets = CatalogResponse['facets']

interface CatalogFiltersProps {
  search: CatalogSearch
  facets: Facets | undefined
  onChange: (patch: Partial<CatalogSearch>) => void
  className?: string
}

const formatPrice = (value: number) => value.toFixed(2).replace('.', ',')

function FacetList({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string
  items: Facets['categories'] | undefined
  selected: string[] | undefined
  onToggle: (slug: string) => void
}) {
  const headingId = `facet-${title.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="text-body-lg font-bold">
        {title}
      </h3>
      <ul className="mt-2 space-y-0.5">
        {(items ?? []).map((item) => {
          const active = selected?.includes(item.slug) ?? false
          return (
            <li key={item.slug}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(item.slug)}
                disabled={item.count === 0 && !active}
                className={cn(
                  'flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left text-body text-text-secondary transition-colors hover:bg-surface-raised hover:text-foreground disabled:opacity-40',
                  active && 'bg-surface-raised font-bold text-primary hover:text-primary',
                )}
              >
                <span>{item.label}</span>
                <span className={cn('font-bold', active ? 'text-primary' : 'text-foreground')}>
                  ({item.count})
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PriceFilter({
  facets,
  search,
  onChange,
}: Pick<CatalogFiltersProps, 'facets' | 'search' | 'onChange'>) {
  const min = Number(facets?.priceRange.min ?? 0)
  const max = Number(facets?.priceRange.max ?? 15)
  const applied: [number, number] = [
    search.minPrice ? Number(search.minPrice) : min,
    search.maxPrice ? Number(search.maxPrice) : max,
  ]
  const [range, setRange] = useState<[number, number]>(applied)

  // Sincroniza quando a URL muda por fora (voltar/avançar, limpar filtros).
  const appliedKey = `${applied[0]}-${applied[1]}`
  const [syncedKey, setSyncedKey] = useState(appliedKey)
  if (syncedKey !== appliedKey) {
    setSyncedKey(appliedKey)
    setRange(applied)
  }

  return (
    <section aria-labelledby="facet-preco">
      <h3 id="facet-preco" className="text-body-lg font-bold">
        Faixa de preço
      </h3>
      <Slider
        className="mt-3 px-1"
        min={min}
        max={max}
        step={0.01}
        minStepsBetweenValues={1}
        value={range}
        onValueChange={(value) => setRange(value as [number, number])}
        thumbLabels={['Preço mínimo em ETH', 'Preço máximo em ETH']}
        disabled={!facets}
      />
      <p className="mt-2 px-2.5 text-body" aria-live="polite">
        Preço: {formatPrice(range[0])} - {formatPrice(range[1])} ETH
      </p>
      <Button
        size="sm"
        className="mt-2 ml-2.5 h-7 px-2.5"
        disabled={!facets}
        onClick={() =>
          onChange({
            minPrice: range[0] > min ? range[0].toFixed(2) : undefined,
            maxPrice: range[1] < max ? range[1].toFixed(2) : undefined,
          })
        }
      >
        Aplicar
      </Button>
    </section>
  )
}

export function CatalogFilters({ search, facets, onChange, className }: CatalogFiltersProps) {
  return (
    <div className={cn('space-y-8 bg-surface-card p-4', className)}>
      <FacetList
        title="Coleções"
        items={facets?.categories}
        selected={search.categories}
        onToggle={(slug) => onChange({ categories: toggleValue(search.categories, slug) })}
      />
      <PriceFilter facets={facets} search={search} onChange={onChange} />
      <FacetList
        title="Rede"
        items={facets?.networks}
        selected={search.networks}
        onToggle={(slug) =>
          onChange({
            networks: toggleValue(
              search.networks,
              slug as NonNullable<CatalogSearch['networks']>[number],
            ),
          })
        }
      />
    </div>
  )
}
