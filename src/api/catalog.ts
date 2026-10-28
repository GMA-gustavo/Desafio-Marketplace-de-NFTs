import { z } from 'zod'
import {
  catalogResponseSchema,
  highlightsSchema,
  nftDetailSchema,
  nftSummarySchema,
  type CatalogQuery,
} from '@/contracts/nft'
import { http } from '@/lib/http'

/** Serializa o estado do catálogo nos parâmetros REST (listas separadas por vírgula). */
export function toCatalogParams(query: CatalogQuery) {
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) continue
    params[key] = Array.isArray(value) ? value.join(',') : value
  }
  return params
}

export const catalogApi = {
  list: (query: CatalogQuery, signal?: AbortSignal) =>
    http
      .get('/nfts', { params: toCatalogParams(query), signal })
      .then((r) => catalogResponseSchema.parse(r.data)),

  highlights: (signal?: AbortSignal) =>
    http.get('/nfts/highlights', { signal }).then((r) => highlightsSchema.parse(r.data)),

  detail: (id: string, signal?: AbortSignal) =>
    http
      .get(`/nfts/${encodeURIComponent(id)}`, { signal })
      .then((r) => nftDetailSchema.parse(r.data)),
}

const favoritesSchema = z.object({ ids: z.array(z.string()), items: z.array(nftSummarySchema) })
export type Favorites = z.infer<typeof favoritesSchema>

export const favoritesApi = {
  list: (signal?: AbortSignal) =>
    http.get('/favorites', { signal }).then((r) => favoritesSchema.parse(r.data)),
  add: (nftId: string) => http.put(`/favorites/${encodeURIComponent(nftId)}`).then(() => undefined),
  remove: (nftId: string) =>
    http.delete(`/favorites/${encodeURIComponent(nftId)}`).then(() => undefined),
}
