import { z } from 'zod'
import { ethAmount, networkSchema } from '@/contracts/common'
import { catalogSortSchema, catalogTabSchema, type CatalogQuery } from '@/contracts/nft'

export const CATALOG_PAGE_SIZE = 9

/**
 * Estado do catálogo na URL. Valores inválidos (link editado à mão) caem no padrão
 * em vez de quebrar a página.
 */
const commaList = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
    z.array(item),
  )

export const catalogSearchSchema = z.object({
  q: z.string().trim().max(60).optional().catch(undefined),
  categories: commaList(z.string()).optional().catch(undefined),
  networks: commaList(networkSchema).optional().catch(undefined),
  minPrice: ethAmount.optional().catch(undefined),
  maxPrice: ethAmount.optional().catch(undefined),
  tab: catalogTabSchema.optional().catch(undefined),
  sort: catalogSortSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

/** Converte a URL nos parâmetros da API (chave da query = parâmetros enviados). */
export function toCatalogQuery(search: CatalogSearch): CatalogQuery {
  return {
    q: search.q || undefined,
    categories: search.categories?.length ? [...search.categories].sort() : undefined,
    networks: search.networks?.length ? [...search.networks].sort() : undefined,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    tab: search.tab ?? 'all',
    sort: search.sort ?? 'recent',
    page: search.page ?? 1,
    pageSize: CATALOG_PAGE_SIZE,
  }
}

export function hasActiveFilters(search: CatalogSearch) {
  return Boolean(
    search.q ||
    search.categories?.length ||
    search.networks?.length ||
    search.minPrice ||
    search.maxPrice,
  )
}

export function toggleValue<T>(list: T[] | undefined, value: T): T[] | undefined {
  const next = list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value]
  return next.length ? next : undefined
}
