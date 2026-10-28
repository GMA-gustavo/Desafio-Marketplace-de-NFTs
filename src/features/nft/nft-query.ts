import { queryOptions } from '@tanstack/react-query'
import { catalogApi } from '@/api/catalog'
import { queryKeys } from '@/api/query-keys'
import { toApiError } from '@/lib/api-error'

export function nftQueryOptions(nftId: string) {
  return queryOptions({
    queryKey: queryKeys.nft(nftId),
    queryFn: ({ signal }) => catalogApi.detail(nftId, signal),
    // 404 é definitivo: não vale nova tentativa.
    retry: (count, error) => toApiError(error).status !== 404 && count < 1,
  })
}
