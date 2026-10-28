import type { Network } from '@/contracts/common'
import { NETWORK_LABEL } from '@/contracts/common'
import type { CatalogQuery, CatalogResponse, NftDetail, NftSummary } from '@/contracts/nft'
import { eth } from '@/lib/money'
import { CATEGORIES } from '../db/seed'
import { db } from '../db/store'
import type { DbNft } from '../db/types'

function defaultEdition(nft: DbNft) {
  return nft.editions.find((e) => e.id === nft.defaultEditionId) ?? nft.editions[0]!
}

export function toSummary(nft: DbNft): NftSummary {
  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    art: nft.art,
    category: nft.category,
    collection: nft.collection,
    network: nft.network,
    price: defaultEdition(nft).price,
    compareAtPrice: nft.compareAtPrice,
    defaultEditionId: nft.defaultEditionId,
    rarity: nft.rarity,
    available: nft.editions.reduce((sum, e) => sum + e.available, 0),
    listedAt: nft.listedAt,
    version: nft.version,
  }
}

export function toDetail(nft: DbNft): NftDetail {
  const { isNew: _n, trending: _t, featured: _f, ...rest } = nft
  return { ...rest, ...toSummary(nft), editions: nft.editions }
}

export function findNft(id: string) {
  return db.state.nfts.find((n) => n.id === id) ?? null
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

type Filter = (nft: DbNft) => boolean

/**
 * Busca + filtros + ordenação + paginação. As contagens de cada faceta
 * consideram todos os outros filtros (padrão de facetas combináveis).
 */
export function queryCatalog(query: CatalogQuery): CatalogResponse {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 9
  const q = query.q ? normalize(query.q.trim()) : ''

  const filters: Record<'q' | 'tab' | 'category' | 'network' | 'price' | 'collection', Filter> = {
    q: (n) =>
      !q || normalize(`${n.name} ${n.collection} ${n.category.label} ${n.tokenId}`).includes(q),
    tab: (n) =>
      query.tab === 'new' ? n.isNew : query.tab === 'trending' ? n.trending >= 70 : true,
    category: (n) => !query.categories?.length || query.categories.includes(n.category.slug),
    network: (n) => !query.networks?.length || query.networks.includes(n.network),
    price: (n) => {
      const price = defaultEdition(n).price
      if (query.minPrice && eth.cmp(price, query.minPrice) < 0) return false
      if (query.maxPrice && eth.cmp(price, query.maxPrice) > 0) return false
      return true
    },
    collection: (n) =>
      (!query.collection || n.collection === query.collection) && n.id !== query.exclude,
  }

  const applyExcept = (except?: keyof typeof filters) =>
    db.state.nfts.filter((n) =>
      Object.entries(filters).every(([key, fn]) => key === except || fn(n)),
    )

  const results = applyExcept()
  const sorted = [...results].sort((a, b) => {
    switch (query.sort ?? 'recent') {
      case 'price-asc':
        return eth.cmp(defaultEdition(a).price, defaultEdition(b).price)
      case 'price-desc':
        return eth.cmp(defaultEdition(b).price, defaultEdition(a).price)
      case 'name':
        return a.name.localeCompare(b.name, 'pt-BR')
      default:
        return query.tab === 'trending'
          ? b.trending - a.trending
          : b.listedAt.localeCompare(a.listedAt)
    }
  })

  const categoryBase = applyExcept('category')
  const networkBase = applyExcept('network')
  const prices = db.state.nfts.map((n) => defaultEdition(n).price)
  const total = sorted.length

  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    facets: {
      categories: CATEGORIES.map((c) => ({
        slug: c.slug,
        label: c.label,
        count: categoryBase.filter((n) => n.category.slug === c.slug).length,
      })),
      networks: (Object.keys(NETWORK_LABEL) as Network[]).map((slug) => ({
        slug,
        label: NETWORK_LABEL[slug],
        count: networkBase.filter((n) => n.network === slug).length,
      })),
      priceRange: {
        min: prices.reduce((a, b) => (eth.cmp(a, b) <= 0 ? a : b)),
        max: prices.reduce((a, b) => eth.max(a, b)),
      },
    },
  }
}
