import { delay } from 'msw'
import { catalogQuerySchema, type CatalogQuery } from '@/contracts/nft'
import { db } from '../db/store'
import { json, MockApiError, noContent, route } from '../http'
import { scenario } from '../scenarios'
import { requireUser } from '../services/auth'
import { findNft, queryCatalog, toDetail, toSummary } from '../services/catalog'

let catalogRequestCount = 0

function parseCatalogQuery(url: URL): CatalogQuery {
  const p = url.searchParams
  const list = (key: string) => p.get(key)?.split(',').filter(Boolean)
  const num = (key: string) => (p.get(key) ? Number(p.get(key)) : undefined)
  const result = catalogQuerySchema.safeParse({
    q: p.get('q') ?? undefined,
    categories: list('categories'),
    networks: list('networks'),
    minPrice: p.get('minPrice') ?? undefined,
    maxPrice: p.get('maxPrice') ?? undefined,
    collection: p.get('collection') ?? undefined,
    exclude: p.get('exclude') ?? undefined,
    tab: p.get('tab') ?? undefined,
    sort: p.get('sort') ?? undefined,
    page: num('page'),
    pageSize: num('pageSize'),
  })
  if (!result.success) throw new MockApiError('validation_error', 'Parâmetros de busca inválidos.')
  return result.data
}

export const catalogHandlers = [
  route('GET', '/nfts', async ({ url }) => {
    const query = parseCatalogQuery(url)
    const config = scenario.config

    if (config.catalog === 'out-of-order') {
      // Requisições ímpares demoram mais que as seguintes: a resposta antiga chega por último.
      catalogRequestCount += 1
      await delay(catalogRequestCount % 2 === 1 ? 1500 : 150)
    }
    if (config.catalog === 'empty') {
      const empty = queryCatalog({ ...query, q: '\u0000sem-resultados' })
      return json({ ...empty, items: [], total: 0, totalPages: 1 })
    }
    return json(queryCatalog(query))
  }),

  route('GET', '/nfts/highlights', () => {
    const featured = db.state.nfts.filter((n) => n.featured)
    const spotlight = db.state.nfts.find((n) => n.id === 'sage-nomad-009') ?? featured[0]!
    return json({ hero: featured.map(toSummary), spotlight: toSummary(spotlight) })
  }),

  route<{ id: string }>('GET', '/nfts/:id', ({ params }) => {
    const nft = findNft(params.id)
    if (!nft) throw new MockApiError('not_found', 'Este NFT não existe ou foi removido.')
    return json(toDetail(nft))
  }),

  route('GET', '/favorites', ({ request }) => {
    const { user } = requireUser(request)
    const ids = db.state.favorites[user.id] ?? []
    const items = ids.flatMap((id) => {
      const nft = findNft(id)
      return nft ? [toSummary(nft)] : []
    })
    return json({ ids, items })
  }),

  route<{ nftId: string }>('PUT', '/favorites/:nftId', ({ request, params }) => {
    const { user } = requireUser(request)
    if (!findNft(params.nftId)) throw new MockApiError('not_found', 'NFT não encontrado.')
    db.write((s) => {
      const list = (s.favorites[user.id] ??= [])
      if (!list.includes(params.nftId)) list.unshift(params.nftId)
    })
    return noContent()
  }),

  route<{ nftId: string }>('DELETE', '/favorites/:nftId', ({ request, params }) => {
    const { user } = requireUser(request)
    db.write((s) => {
      s.favorites[user.id] = (s.favorites[user.id] ?? []).filter((id) => id !== params.nftId)
    })
    return noContent()
  }),
]
