import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { RotateCw, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useEffectEvent, useId, useState } from 'react'
import { catalogApi } from '@/api/catalog'
import { queryKeys } from '@/api/query-keys'
import { NftImage } from '@/components/nft/nft-image'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { NETWORK_LABEL } from '@/contracts/common'
import {
  CATALOG_SORT_LABEL,
  catalogSortSchema,
  type CatalogResponse,
  type CatalogSort,
  type CatalogTab,
} from '@/contracts/nft'
import { errorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { CatalogFilters } from './catalog-filters'
import { hasActiveFilters, toCatalogQuery, type CatalogSearch } from './catalog-search'
import { NftCard, NftCardSkeleton } from './nft-card'
import { Pagination } from './pagination'

const TABS: { value: CatalogTab; label: string }[] = [
  { value: 'all', label: 'Todos os NFTs' },
  { value: 'new', label: 'Novos lançamentos' },
  { value: 'trending', label: 'Em alta' },
]

function useCatalogSearch() {
  const search = useSearch({ from: '/', shouldThrow: false }) ?? {}
  const navigate = useNavigate()
  /** Toda mudança de filtro volta para a página 1 e vira uma entrada no histórico. */
  const update = (patch: Partial<CatalogSearch>, { keepPage = false } = {}) =>
    navigate({
      to: '/',
      search: (prev: CatalogSearch) => ({
        ...prev,
        ...patch,
        ...(keepPage ? {} : { page: undefined }),
      }),
      resetScroll: false,
    })
  return { search, update }
}

function SearchBox({
  value,
  onSearch,
}: {
  value?: string
  onSearch: (q: string | undefined) => void
}) {
  const id = useId()
  const [text, setText] = useState(value ?? '')
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    setSynced(value)
    setText(value ?? '')
  }
  const emitSearch = useEffectEvent((q: string | undefined) => onSearch(q))

  useEffect(() => {
    const next = text.trim() || undefined
    if (next === value) return
    const timer = setTimeout(() => emitSearch(next), 350)
    return () => clearTimeout(timer)
  }, [text, value])

  return (
    <form role="search" className="relative flex-1" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor={id} className="sr-only">
        Buscar NFTs por nome, coleção ou token
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-[22px] -translate-y-1/2 text-text-muted md:size-4 md:text-text-secondary"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Explorar coleções"
        autoComplete="off"
        className="h-[45px] w-full rounded-[10px] bg-surface-card pr-3 pl-11 text-body font-bold placeholder:text-text-muted md:h-9 md:rounded-sm md:border md:border-border md:pl-9 md:font-normal md:placeholder:text-text-secondary"
      />
    </form>
  )
}

function SortSelect({
  value,
  onChange,
}: {
  value: CatalogSort
  onChange: (sort: CatalogSort) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-1 text-[15px] leading-5">
      <label htmlFor={id} className="whitespace-nowrap">
        Ordenar por:
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(catalogSortSchema.parse(e.target.value))}
        className="rounded-sm bg-transparent pr-1 text-[15px] leading-5 text-foreground focus-visible:outline-2"
      >
        {Object.entries(CATALOG_SORT_LABEL).map(([key, label]) => (
          <option key={key} value={key} className="bg-surface-card">
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Busca + gaveta de filtros e ordenação (celular e tablet). */
function CatalogToolbar({
  search,
  facets,
  update,
}: {
  search: CatalogSearch
  facets: CatalogResponse['facets'] | undefined
  update: ReturnType<typeof useCatalogSearch>['update']
}) {
  return (
    <div className="flex gap-2">
      <SearchBox value={search.q} onSearch={(q) => void update({ q })} />
      <Sheet>
        <SheetTrigger
          render={
            <button
              type="button"
              aria-label="Abrir filtros e ordenação"
              className="grid size-[45px] shrink-0 place-items-center rounded-[14px] bg-gradient-to-b from-primary/45 to-primary text-ink"
            />
          }
        >
          <SlidersHorizontal className="size-[22px]" aria-hidden />
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-surface-card"
        >
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 px-4 pb-8">
            <SortSelect
              value={search.sort ?? 'recent'}
              onChange={(sort) => void update({ sort })}
            />
            <CatalogFilters
              className="p-0"
              search={search}
              facets={facets}
              onChange={(patch) => void update(patch)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/**
 * Frame Mobile / Início: a barra de busca e filtros fica no topo, acima do hero.
 * Usa a mesma consulta do catálogo (mesma chave no cache) só para ler as facetas.
 */
export function MobileCatalogBar() {
  const { search, update } = useCatalogSearch()
  const query = toCatalogQuery(search)
  const catalog = useQuery({
    queryKey: queryKeys.catalog(query),
    queryFn: ({ signal }) => catalogApi.list(query, signal),
    placeholderData: keepPreviousData,
  })
  return <CatalogToolbar search={search} facets={catalog.data?.facets} update={update} />
}

function ActiveFilters({
  search,
  labels,
  update,
}: {
  search: CatalogSearch
  labels: Record<string, string>
  update: (patch: Partial<CatalogSearch>) => void
}) {
  if (!hasActiveFilters(search)) return null
  const chips: { label: string; remove: Partial<CatalogSearch> }[] = [
    ...(search.q ? [{ label: `“${search.q}”`, remove: { q: undefined } }] : []),
    ...(search.categories ?? []).map((slug) => ({
      label: labels[slug] ?? slug,
      remove: { categories: search.categories!.filter((c) => c !== slug) },
    })),
    ...(search.networks ?? []).map((slug) => ({
      label: NETWORK_LABEL[slug],
      remove: { networks: search.networks!.filter((n) => n !== slug) },
    })),
    ...(search.minPrice || search.maxPrice
      ? [
          {
            label: `${search.minPrice ?? '0'} – ${search.maxPrice ?? '∞'} ETH`,
            remove: { minPrice: undefined, maxPrice: undefined },
          },
        ]
      : []),
  ]
  return (
    <ul aria-label="Filtros ativos" className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.label}>
          <button
            type="button"
            onClick={() => update(chip.remove)}
            className="flex items-center gap-1 rounded-full border border-primary/60 px-2.5 py-0.5 text-caption hover:bg-primary/10"
            aria-label={`Remover filtro ${chip.label}`}
          >
            {chip.label} <X className="size-3" aria-hidden />
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() =>
            update({
              q: undefined,
              categories: undefined,
              networks: undefined,
              minPrice: undefined,
              maxPrice: undefined,
            })
          }
          className="text-caption text-primary underline-offset-2 hover:underline"
        >
          Limpar filtros
        </button>
      </li>
    </ul>
  )
}

function Spotlight() {
  const highlights = useQuery({
    queryKey: queryKeys.highlights,
    queryFn: ({ signal }) => catalogApi.highlights(signal),
  })
  const nft = highlights.data?.spotlight
  return (
    // Featured NFT Banner do Figma: 310 × 470, títulos acima e arte de 368 px colada na base.
    <section
      aria-labelledby="spotlight-title"
      className="flex h-[470px] flex-col gap-4 bg-gradient-to-b from-primary/10 to-primary/[0.03] pt-6 pb-1"
    >
      <div className="space-y-4">
        <h2 id="spotlight-title" className="px-5 text-[24px] leading-8 font-bold text-text-accent">
          NFT EM DESTAQUE
        </h2>
        <p className="px-5 text-center text-[22px] leading-4 font-bold">OFERTA LIMITADA</p>
      </div>
      {nft ? (
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block">
          <NftImage
            art={nft.art}
            alt={`${nft.name} — ${nft.price} ETH`}
            sizes="310px"
            className="aspect-auto h-[368px] rounded-[22px]"
          />
        </Link>
      ) : (
        <Skeleton className="h-[368px] w-full rounded-[22px]" />
      )}
    </section>
  )
}

export function CatalogSection() {
  const { search, update } = useCatalogSearch()
  const query = toCatalogQuery(search)
  const catalog = useQuery({
    queryKey: queryKeys.catalog(query),
    queryFn: ({ signal }) => catalogApi.list(query, signal),
    // Mantém a página anterior visível enquanto a nova chega; respostas de chaves antigas são descartadas.
    placeholderData: keepPreviousData,
  })

  const data = catalog.data
  const facets = data?.facets
  const categoryLabels = Object.fromEntries(
    (facets?.categories ?? []).map((c) => [c.slug, c.label]),
  )
  const isUpdating = catalog.isPlaceholderData || (catalog.isFetching && !catalog.isPending)
  const tab = search.tab ?? 'all'
  const goToPage = (page: number) => {
    void update({ page }, { keepPage: true })
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section id="catalogo" aria-labelledby="catalogo-title" className="scroll-mt-4">
      <h2 id="catalogo-title" className="sr-only">
        Catálogo de NFTs
      </h2>
      {/* Products do Figma: barra lateral de 310 px, 48 px de espaço e grade de 842 px. */}
      <div className="grid gap-8 lg:grid-cols-[253px_1fr] lg:gap-10 xl:grid-cols-[310px_1fr] xl:gap-12">
        <aside className="hidden space-y-6 lg:block" aria-label="Filtros do catálogo">
          <CatalogFilters
            search={search}
            facets={facets}
            onChange={(patch) => void update(patch)}
          />
          <Spotlight />
        </aside>

        <div className="relative min-w-0 space-y-4 md:space-y-6 lg:space-y-8">
          <div className="hidden md:block lg:hidden">
            <CatalogToolbar search={search} facets={facets} update={update} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div
              role="group"
              aria-label="Lista de NFTs"
              className="flex gap-4 overflow-x-auto md:gap-5"
            >
              {TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={tab === t.value}
                  onClick={() => void update({ tab: t.value === 'all' ? undefined : t.value })}
                  className={cn(
                    // Mobile: 14 px, ativo em negrito; desktop: 15 px médio (Tabs dos dois frames).
                    'border-b-2 border-transparent pb-0.5 text-body leading-4 whitespace-nowrap transition-colors hover:text-primary md:text-[15px] md:font-medium',
                    tab === t.value && 'border-primary font-bold text-text-accent',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="hidden lg:block">
              <SortSelect
                value={search.sort ?? 'recent'}
                onChange={(sort) => void update({ sort })}
              />
            </div>
          </div>

          {/* No celular, sem filtros ativos, a linha só leva o contador (sr-only): sai do fluxo. */}
          <div className="flex flex-wrap items-center justify-between gap-3 max-md:not-has-[ul]:absolute">
            <div className="hidden w-64 lg:flex">
              <SearchBox value={search.q} onSearch={(q) => void update({ q })} />
            </div>
            <ActiveFilters search={search} labels={categoryLabels} update={(p) => void update(p)} />
            {/* No celular o frame não mostra a contagem: ela fica só para leitores de tela. */}
            <p
              className="ml-auto text-caption text-text-secondary max-md:sr-only"
              aria-live="polite"
              aria-atomic
            >
              {catalog.isPending
                ? 'Carregando NFTs…'
                : data
                  ? `${data.total} ${data.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}${isUpdating ? ' · atualizando…' : ''}`
                  : ''}
            </p>
          </div>

          {catalog.isError && data && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-body"
            >
              <span>Não foi possível atualizar a lista. {errorMessage(catalog.error)}</span>
              <Button size="sm" variant="outline" onClick={() => void catalog.refetch()}>
                <RotateCw className="size-3.5" aria-hidden /> Tentar novamente
              </Button>
            </div>
          )}

          {catalog.isPending ? (
            <ul
              className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:gap-x-7 lg:grid-cols-3 lg:gap-x-[34px] lg:gap-y-18"
              aria-hidden
            >
              {Array.from({ length: 9 }, (_, i) => (
                <li key={i}>
                  <NftCardSkeleton />
                </li>
              ))}
            </ul>
          ) : catalog.isError && !data ? (
            <div
              role="alert"
              className="grid place-items-center gap-3 rounded-sm bg-surface-card px-6 py-16 text-center"
            >
              <p className="text-title font-bold">Não foi possível carregar o catálogo</p>
              <p className="text-text-secondary">{errorMessage(catalog.error)}</p>
              <Button onClick={() => void catalog.refetch()}>
                <RotateCw className="size-4" aria-hidden /> Tentar novamente
              </Button>
            </div>
          ) : data && data.items.length === 0 ? (
            <div className="grid place-items-center gap-3 rounded-sm bg-surface-card px-6 py-16 text-center">
              <p className="text-title font-bold">Nenhum NFT encontrado</p>
              <p className="max-w-sm text-text-secondary">
                Tente outros termos de busca ou remova alguns filtros para ver mais resultados.
              </p>
              {hasActiveFilters(search) && (
                <Button
                  variant="outline"
                  onClick={() =>
                    void update({
                      q: undefined,
                      categories: undefined,
                      networks: undefined,
                      minPrice: undefined,
                      maxPrice: undefined,
                    })
                  }
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <ul
              aria-busy={isUpdating}
              className={cn(
                'grid grid-cols-2 gap-x-4 gap-y-6 pb-8 transition-opacity sm:grid-cols-3 sm:gap-y-8 sm:pb-0 md:gap-x-7 lg:grid-cols-3 lg:gap-x-[34px] lg:gap-y-18 max-sm:[&>li:nth-child(even)]:translate-y-8',
                isUpdating && 'opacity-60',
              )}
            >
              {data?.items.map((nft, i) => (
                <li key={nft.id}>
                  <NftCard nft={nft} priority={i < 3} />
                </li>
              ))}
            </ul>
          )}

          {data && (
            // 88 px entre a grade e a paginação, como no Figma.
            <div className="lg:pt-14">
              <Pagination page={data.page} totalPages={data.totalPages} onChange={goToPage} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
