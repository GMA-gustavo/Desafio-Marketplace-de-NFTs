import { z } from 'zod'
import { ethAmount, isoDate, networkSchema, paginated } from './common'

export const editionIdSchema = z.enum(['1-1', '1-10', '1-50', 'open'])
export type EditionId = z.infer<typeof editionIdSchema>

export const EDITION_LABEL: Record<EditionId, string> = {
  '1-1': '1/1',
  '1-10': '1/10',
  '1-50': '1/50',
  open: 'ABERTA',
}

export const editionSchema = z.object({
  id: editionIdSchema,
  price: ethAmount,
  /** Tiragem total; null para edição aberta. */
  supply: z.number().int().nullable(),
  available: z.number().int().nonnegative(),
  /** Limite por pedido (min entre estoque e regra comercial). */
  maxPerOrder: z.number().int().nonnegative(),
})
export type Edition = z.infer<typeof editionSchema>

export const categorySchema = z.object({ slug: z.string(), label: z.string() })
export type Category = z.infer<typeof categorySchema>

export const nftSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenId: z.string(),
  art: z.string(),
  category: categorySchema,
  collection: z.string(),
  network: networkSchema,
  /** Preço da edição padrão. */
  price: ethAmount,
  compareAtPrice: ethAmount.nullable(),
  defaultEditionId: editionIdSchema,
  rarity: z.enum(['comum', 'raro']),
  available: z.number().int().nonnegative(),
  listedAt: isoDate,
  version: z.number().int(),
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  about: z.string(),
  networkInfo: z.string(),
  contractInfo: z.string(),
  royaltiesInfo: z.string(),
  creator: z.string(),
  attributes: z.array(z.string()),
  gallery: z.array(z.string()),
  rating: z.number(),
  reviewCount: z.number().int(),
  editions: z.array(editionSchema),
})
export type NftDetail = z.infer<typeof nftDetailSchema>

export const catalogTabSchema = z.enum(['all', 'new', 'trending'])
export type CatalogTab = z.infer<typeof catalogTabSchema>

export const catalogSortSchema = z.enum(['recent', 'price-asc', 'price-desc', 'name'])
export type CatalogSort = z.infer<typeof catalogSortSchema>

export const CATALOG_SORT_LABEL: Record<CatalogSort, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  name: 'Nome (A–Z)',
}

/** Parâmetros aceitos por GET /nfts (também o estado da URL do catálogo). */
export const catalogQuerySchema = z.object({
  q: z.string().optional(),
  categories: z.array(z.string()).optional(),
  networks: z.array(networkSchema).optional(),
  minPrice: ethAmount.optional(),
  maxPrice: ethAmount.optional(),
  collection: z.string().optional(),
  exclude: z.string().optional(),
  tab: catalogTabSchema.optional(),
  sort: catalogSortSchema.optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
})
export type CatalogQuery = z.infer<typeof catalogQuerySchema>

export const facetSchema = z.object({
  slug: z.string(),
  label: z.string(),
  count: z.number().int(),
})

export const catalogResponseSchema = paginated(nftSummarySchema).extend({
  facets: z.object({
    categories: z.array(facetSchema),
    networks: z.array(facetSchema),
    priceRange: z.object({ min: ethAmount, max: ethAmount }),
  }),
})
export type CatalogResponse = z.infer<typeof catalogResponseSchema>

export const highlightsSchema = z.object({
  hero: z.array(nftSummarySchema),
  spotlight: nftSummarySchema,
})
export type Highlights = z.infer<typeof highlightsSchema>
