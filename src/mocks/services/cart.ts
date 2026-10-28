import type { Cart, Quote, QuoteLineStatus } from '@/contracts/cart'
import type { Network } from '@/contracts/common'
import type { EditionId } from '@/contracts/nft'
import { eth } from '@/lib/money'
import { randomId } from '../crypto'
import { db } from '../db/store'
import type { DbCart, DbCoupon, DbQuote, DbUser } from '../db/types'
import { MockApiError } from '../http'
import { findNft } from './catalog'

export const CART_HEADER = 'X-Cart-Id'

/** Taxa de rede estimada (em ETH) por rede escolhida no checkout. */
export const NETWORK_FEE: Record<Network, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
}

const QUOTE_TTL_MS = 10 * 60_000

function newCart(userId: string | null): DbCart {
  return {
    id: randomId('cart'),
    userId,
    items: [],
    couponCode: null,
    updatedAt: new Date().toISOString(),
    version: 1,
  }
}

/** Carrinho do usuário autenticado ou do visitante (identificado por X-Cart-Id). */
export function resolveCart(request: Request, user: DbUser | null): DbCart {
  if (user) {
    const existing = db.state.carts.find((c) => c.userId === user.id)
    if (existing) return existing
    return db.write((s) => {
      const cart = newCart(user.id)
      s.carts.push(cart)
      return cart
    })
  }
  const guestId = request.headers.get(CART_HEADER)
  const guest = guestId ? db.state.carts.find((c) => c.id === guestId && c.userId === null) : null
  if (guest) return guest
  return db.write((s) => {
    const cart = newCart(null)
    s.carts.push(cart)
    return cart
  })
}

export function findEdition(nftId: string, editionId: EditionId) {
  const nft = findNft(nftId)
  if (!nft) throw new MockApiError('not_found', 'NFT não encontrado.')
  const edition = nft.editions.find((e) => e.id === editionId)
  if (!edition)
    throw new MockApiError('edition_unavailable', 'Esta edição não existe para este NFT.')
  return { nft, edition }
}

export function toCartDto(cart: DbCart): Cart {
  const items = cart.items.flatMap((item) => {
    const nft = findNft(item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!nft || !edition) return []
    return [
      {
        id: item.id,
        nftId: item.nftId,
        editionId: item.editionId,
        quantity: item.quantity,
        name: nft.name,
        tokenId: nft.tokenId,
        art: nft.art,
        unitPrice: edition.price,
        available: edition.available,
        maxPerOrder: edition.maxPerOrder,
        previousUnitPrice: eth.eq(item.priceSeen, edition.price) ? null : item.priceSeen,
      },
    ]
  })
  return {
    id: cart.id,
    items,
    couponCode: cart.couponCode,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    updatedAt: cart.updatedAt,
    version: cart.version,
  }
}

export function touch(cart: DbCart) {
  cart.updatedAt = new Date().toISOString()
  cart.version += 1
}

export function couponStatus(code: string): {
  coupon: DbCoupon | null
  status: 'applied' | 'invalid' | 'expired'
} {
  const coupon = db.state.coupons.find((c) => c.code === code.trim().toUpperCase()) ?? null
  if (!coupon) return { coupon: null, status: 'invalid' }
  if (new Date(coupon.expiresAt).getTime() < Date.now()) return { coupon, status: 'expired' }
  return { coupon, status: 'applied' }
}

/** Calcula a cotação vigente do carrinho (fonte da verdade para o checkout). */
export function computeQuote(
  cart: DbCart,
  network: Network,
): { quote: Quote; fingerprint: string } {
  const lines = cart.items.flatMap((item) => {
    const nft = findNft(item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!nft || !edition) return []
    let status: QuoteLineStatus = 'ok'
    if (edition.available === 0) status = 'sold_out'
    else if (item.quantity > edition.maxPerOrder) status = 'insufficient'
    else if (!eth.eq(item.priceSeen, edition.price)) status = 'price_changed'
    return [
      {
        itemId: item.id,
        nftId: nft.id,
        editionId: edition.id,
        name: nft.name,
        tokenId: nft.tokenId,
        art: nft.art,
        quantity: item.quantity,
        unitPrice: edition.price,
        lineTotal: eth.mul(edition.price, item.quantity),
        available: edition.available,
        status,
      },
    ]
  })

  const subtotal = eth.add('0', ...lines.map((l) => l.lineTotal))
  let coupon: Quote['coupon'] = null
  let discount = '0'
  if (cart.couponCode) {
    const result = couponStatus(cart.couponCode)
    coupon = {
      code: cart.couponCode,
      status: result.status,
      description: result.coupon?.description ?? 'Código não encontrado',
    }
    if (result.status === 'applied' && result.coupon)
      discount = eth.percent(subtotal, result.coupon.percentOff)
  }
  const networkFee = lines.length ? NETWORK_FEE[network] : '0'
  const total = eth.add(eth.sub(subtotal, discount), networkFee)
  const now = Date.now()

  const quote: Quote = {
    id: randomId('quo'),
    network,
    lines,
    coupon,
    subtotal,
    discount,
    networkFee,
    total,
    valid:
      lines.length > 0 && lines.every((l) => l.status === 'ok' || l.status === 'price_changed'),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
  }
  const fingerprint = JSON.stringify([
    lines.map((l) => [
      l.nftId,
      l.editionId,
      l.quantity,
      l.unitPrice,
      l.status === 'ok' || l.status === 'price_changed',
    ]),
    coupon?.status ?? null,
    discount,
    networkFee,
    total,
  ])
  return { quote, fingerprint }
}

/** Gera e registra uma cotação; o pedido precisa referenciar uma cotação ainda idêntica. */
export function issueQuote(cart: DbCart, network: Network): Quote {
  const { quote, fingerprint } = computeQuote(cart, network)
  const record: DbQuote = {
    id: quote.id,
    cartId: cart.id,
    network,
    fingerprint,
    total: quote.total,
    createdAt: quote.createdAt,
    expiresAt: quote.expiresAt,
  }
  db.write((s) => {
    s.quotes.push(record)
    if (s.quotes.length > 50) s.quotes.splice(0, s.quotes.length - 50)
  })
  return quote
}

/** O usuário revisou os valores atuais: os avisos de alteração de preço são zerados. */
export function acknowledgePrices(cart: DbCart) {
  for (const item of cart.items) {
    const nft = findNft(item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (edition) item.priceSeen = edition.price
  }
}
