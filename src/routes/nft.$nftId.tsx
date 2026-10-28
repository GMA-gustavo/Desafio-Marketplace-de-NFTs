import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { editionIdSchema } from '@/contracts/nft'
import { NftDetailPage } from '@/features/nft/nft-detail-page'
import { nftQueryOptions } from '@/features/nft/nft-query'

export const Route = createFileRoute('/nft/$nftId')({
  validateSearch: z.object({ edition: editionIdSchema.optional().catch(undefined) }),
  staticData: { hideMobileChrome: true },
  // Pré-carrega sem bloquear: a página mostra o skeleton enquanto os dados chegam.
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftQueryOptions(params.nftId))
  },
  head: () => ({ meta: [{ title: 'Detalhes do NFT — Kurio' }] }),
  component: NftRoute,
})

function NftRoute() {
  const { nftId } = Route.useParams()
  const { edition } = Route.useSearch()
  return <NftDetailPage nftId={nftId} edition={edition} />
}
