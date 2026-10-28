import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@/api/catalog'
import { queryKeys } from '@/api/query-keys'
import type { CatalogQuery } from '@/contracts/nft'
import { NftCard, NftCardSkeleton } from './nft-card'

/** Faixa horizontal de NFTs ("Mais desta coleção", "Colecionadores também viram"). */
export function NftRow({ title, query }: { title: string; query: CatalogQuery }) {
  const params = { pageSize: 5, page: 1, ...query }
  const list = useQuery({
    queryKey: queryKeys.catalog(params),
    queryFn: ({ signal }) => catalogApi.list(params, signal),
  })
  const headingId = `row-${title.toLowerCase().replace(/\W+/g, '-')}`

  if (list.isSuccess && list.data.items.length === 0) return null

  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="border-b border-border pb-3 text-body-lg font-bold text-primary"
      >
        {title}
      </h2>
      <ul className="-mx-4 mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
        {list.isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="w-40 shrink-0 md:w-auto">
                <NftCardSkeleton />
              </li>
            ))
          : list.data?.items.map((nft) => (
              <li key={nft.id} className="w-40 shrink-0 snap-start md:w-auto">
                <NftCard nft={nft} sizes="(min-width: 768px) 180px, 160px" showFavorite="never" />
              </li>
            ))}
      </ul>
      {list.isError && (
        <p role="alert" className="mt-4 text-body text-text-secondary">
          Não foi possível carregar sugestões agora.
        </p>
      )}
    </section>
  )
}
