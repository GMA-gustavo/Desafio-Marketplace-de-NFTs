import { z } from 'zod'
import {
  addCartItemInputSchema,
  applyCouponInputSchema,
  updateCartItemInputSchema,
} from '@/contracts/cart'
import { networkSchema } from '@/contracts/common'
import { randomId } from '../crypto'
import { db } from '../db/store'
import { json, MockApiError, parseBody, route } from '../http'
import { optionalUser, requireUser } from '../services/auth'
import {
  acknowledgePrices,
  couponStatus,
  findEdition,
  issueQuote,
  resolveCart,
  toCartDto,
  touch,
} from '../services/cart'

function currentCart(request: Request) {
  const auth = optionalUser(request)
  return resolveCart(request, auth?.user ?? null)
}

function stockError(available: number, maxPerOrder: number) {
  return new MockApiError(
    'insufficient_stock',
    available === 0
      ? 'Esta edição esgotou.'
      : `Quantidade indisponível: no máximo ${maxPerOrder} por pedido para esta edição.`,
    { details: { available, maxPerOrder } },
  )
}

export const cartHandlers = [
  route('GET', '/cart', ({ request }) => json(toCartDto(currentCart(request)))),

  route('POST', '/cart/items', async ({ request }) => {
    const input = await parseBody(request, addCartItemInputSchema)
    const cart = currentCart(request)
    const { edition } = findEdition(input.nftId, input.editionId)
    if (edition.available === 0) {
      throw new MockApiError('edition_unavailable', 'Esta edição está esgotada.')
    }
    db.write(() => {
      const line = cart.items.find(
        (i) => i.nftId === input.nftId && i.editionId === input.editionId,
      )
      const quantity = (line?.quantity ?? 0) + input.quantity
      if (quantity > edition.maxPerOrder) throw stockError(edition.available, edition.maxPerOrder)
      if (line) {
        line.quantity = quantity
        line.priceSeen = edition.price
      } else {
        cart.items.push({
          id: randomId('itm'),
          nftId: input.nftId,
          editionId: input.editionId,
          quantity,
          priceSeen: edition.price,
        })
      }
      touch(cart)
    })
    return json(toCartDto(cart), { status: 201 })
  }),

  route<{ itemId: string }>('PATCH', '/cart/items/:itemId', async ({ request, params }) => {
    const { quantity } = await parseBody(request, updateCartItemInputSchema)
    const cart = currentCart(request)
    const line = cart.items.find((i) => i.id === params.itemId)
    if (!line) throw new MockApiError('not_found', 'Item não está mais no carrinho.')
    const { edition } = findEdition(line.nftId, line.editionId)
    // Diminuir é sempre permitido (ajuda a resolver falta de estoque); aumentar respeita o limite.
    if (quantity > line.quantity && quantity > edition.maxPerOrder) {
      throw stockError(edition.available, edition.maxPerOrder)
    }
    db.write(() => {
      line.quantity = quantity
      touch(cart)
    })
    return json(toCartDto(cart))
  }),

  route<{ itemId: string }>('DELETE', '/cart/items/:itemId', ({ request, params }) => {
    const cart = currentCart(request)
    db.write(() => {
      cart.items = cart.items.filter((i) => i.id !== params.itemId)
      if (!cart.items.length) cart.couponCode = null
      touch(cart)
    })
    return json(toCartDto(cart))
  }),

  route('PUT', '/cart/coupon', async ({ request }) => {
    const { code } = await parseBody(request, applyCouponInputSchema)
    const cart = currentCart(request)
    const { status } = couponStatus(code)
    if (status === 'invalid') {
      throw new MockApiError('coupon_invalid', 'Cupom inválido.', {
        fieldErrors: { code: 'Este código não existe.' },
      })
    }
    if (status === 'expired') {
      throw new MockApiError('coupon_expired', 'Cupom expirado.', {
        fieldErrors: { code: 'Este cupom expirou.' },
      })
    }
    db.write(() => {
      cart.couponCode = code.trim().toUpperCase()
      touch(cart)
    })
    return json(toCartDto(cart))
  }),

  route('DELETE', '/cart/coupon', ({ request }) => {
    const cart = currentCart(request)
    db.write(() => {
      cart.couponCode = null
      touch(cart)
    })
    return json(toCartDto(cart))
  }),

  route('POST', '/cart/acknowledge', ({ request }) => {
    const cart = currentCart(request)
    db.write(() => {
      acknowledgePrices(cart)
      touch(cart)
    })
    return json(toCartDto(cart))
  }),

  /** Ao autenticar, os itens do visitante entram no carrinho do usuário. */
  route('POST', '/cart/merge', async ({ request }) => {
    const { user } = requireUser(request)
    const { guestCartId } = await parseBody(request, z.object({ guestCartId: z.string() }))
    const userCart = resolveCart(request, user)
    db.write((s) => {
      const guest = s.carts.find((c) => c.id === guestCartId && c.userId === null)
      if (!guest || guest.id === userCart.id) return
      for (const item of guest.items) {
        const nft = s.nfts.find((n) => n.id === item.nftId)
        const edition = nft?.editions.find((e) => e.id === item.editionId)
        if (!edition || edition.maxPerOrder === 0) continue
        const line = userCart.items.find(
          (i) => i.nftId === item.nftId && i.editionId === item.editionId,
        )
        if (line) line.quantity = Math.min(edition.maxPerOrder, line.quantity + item.quantity)
        else
          userCart.items.push({ ...item, quantity: Math.min(edition.maxPerOrder, item.quantity) })
      }
      userCart.couponCode ??= guest.couponCode
      s.carts = s.carts.filter((c) => c.id !== guest.id)
      touch(userCart)
    })
    return json(toCartDto(userCart))
  }),

  route('GET', '/quote', ({ request, url }) => {
    const network = networkSchema
      .catch('ethereum')
      .parse(url.searchParams.get('network') ?? 'ethereum')
    return json(issueQuote(currentCart(request), network))
  }),
]
