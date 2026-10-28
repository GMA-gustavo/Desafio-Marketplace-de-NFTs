import type { EditionId } from '@/contracts/nft'
import { eth } from '@/lib/money'
import { db } from '../db/store'
import { MockApiError } from '../http'
import { publishNftUpdated } from '../realtime'

const MAX_PER_ORDER = 10

export interface NftChange {
  editionId?: EditionId
  /** Novo preço absoluto da edição. */
  price?: string
  /** Multiplica o preço (ex.: "1.1" = +10%). */
  priceFactor?: string
  available?: number
  /** Soma ao estoque (negativo para reservar). */
  availableDelta?: number
}

/**
 * Única porta de alteração de preço/estoque: incrementa a versão,
 * persiste e publica `nft.updated` — REST e eventos sempre coerentes.
 */
export function updateNft(nftId: string, change: NftChange) {
  const nft = db.write((s) => {
    const target = s.nfts.find((n) => n.id === nftId)
    if (!target) throw new MockApiError('not_found', 'NFT não encontrado.')
    const editions = change.editionId
      ? target.editions.filter((e) => e.id === change.editionId)
      : target.editions
    for (const edition of editions) {
      if (change.price) edition.price = change.price
      if (change.priceFactor)
        edition.price = eth.round(eth.mul(edition.price, change.priceFactor), 3)
      if (change.available !== undefined) edition.available = Math.max(0, change.available)
      if (change.availableDelta)
        edition.available = Math.max(0, edition.available + change.availableDelta)
      edition.maxPerOrder = Math.min(edition.available, MAX_PER_ORDER)
    }
    target.version += 1
    return target
  })
  publishNftUpdated(nft)
  return nft
}
