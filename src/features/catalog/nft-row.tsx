import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { catalogApi } from '@/api/catalog'
import { queryKeys } from '@/api/query-keys'
import type { CatalogQuery } from '@/contracts/nft'
import { cn } from '@/lib/utils'
import { NftCard, NftCardSkeleton } from './nft-card'

const PER_PAGE = 5

/**
 * Faixa horizontal de NFTs ("Mais desta coleção", "Colecionadores também viram").
 * No desktop mostra 5 por vez, com os pontos do Figma para trocar de grupo; no celular rola.
 */
export function NftRow({ title, query }: { title: string; query: CatalogQuery }) {
  const params = { pageSize: PER_PAGE * 3, page: 1, ...query }
  const list = useQuery({
    queryKey: queryKeys.catalog(params),
    queryFn: ({ signal }) => catalogApi.list(params, signal),
  })
  const [group, setGroup] = useState(0)
  const headingId = `row-${title.toLowerCase().replace(/\W+/g, '-')}`

  if (list.isSuccess && list.data.items.length === 0) return null

  const items = list.data?.items ?? []
  const groups = Math.ceil(items.length / PER_PAGE)
  const current = Math.min(group, Math.max(groups - 1, 0))

  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="border-b border-primary/30 pb-3 text-[17px] leading-4 font-bold text-text-accent"
      >
        {title}
      </h2>
      <ul className="-mx-4 mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 md:mx-0 md:mt-8 md:grid md:grid-cols-5 md:overflow-visible md:px-0 md:pb-0 lg:gap-[26px]">
        {list.isPending
          ? Array.from({ length: PER_PAGE }, (_, i) => (
              <li key={i} className="w-40 shrink-0 md:w-auto">
                <NftCardSkeleton />
              </li>
            ))
          : items.map((nft, i) => (
              <li
                key={nft.id}
                className={cn(
                  'w-40 shrink-0 snap-start md:w-auto',
                  Math.floor(i / PER_PAGE) !== current && 'md:hidden',
                )}
              >
                <NftCard
                  nft={nft}
                  variant="row"
                  sizes="(min-width: 768px) 212px, 160px"
                  showFavorite="never"
                />
              </li>
            ))}
      </ul>
      {groups > 1 && (
        <div
          role="group"
          aria-label={`Grupos de ${title}`}
          className="mt-8 hidden justify-center md:flex"
        >
          {Array.from({ length: groups }, (_, i) => (
            // Alvo de 24 px em volta do ponto de 12 px do Figma (área mínima de toque).
            <button
              key={i}
              type="button"
              onClick={() => setGroup(i)}
              aria-label={`Mostrar grupo ${i + 1} de ${groups}`}
              aria-current={i === current ? 'true' : undefined}
              className="group grid size-6 place-items-center"
            >
              <span
                className={cn(
                  'block size-3 rounded-full border-[1.3px] border-primary transition-colors group-hover:bg-primary/40',
                  i === current && 'bg-primary group-hover:bg-primary',
                )}
              />
            </button>
          ))}
        </div>
      )}
      {list.isError && (
        <p role="alert" className="mt-4 text-body text-text-secondary">
          Não foi possível carregar sugestões agora.
        </p>
      )}
    </section>
  )
}
