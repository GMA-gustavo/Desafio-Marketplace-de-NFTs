import { cartSchema, quoteSchema, type AddCartItemInput } from '@/contracts/cart'
import type { Network } from '@/contracts/common'
import { http } from '@/lib/http'

const parseCart = (r: { data: unknown }) => cartSchema.parse(r.data)

export const cartApi = {
  get: (signal?: AbortSignal) => http.get('/cart', { signal }).then(parseCart),
  addItem: (input: AddCartItemInput) => http.post('/cart/items', input).then(parseCart),
  updateItem: (itemId: string, quantity: number) =>
    http.patch(`/cart/items/${itemId}`, { quantity }).then(parseCart),
  removeItem: (itemId: string) => http.delete(`/cart/items/${itemId}`).then(parseCart),
  applyCoupon: (code: string) => http.put('/cart/coupon', { code }).then(parseCart),
  removeCoupon: () => http.delete('/cart/coupon').then(parseCart),
  acknowledge: () => http.post('/cart/acknowledge').then(parseCart),
  merge: (guestCartId: string) => http.post('/cart/merge', { guestCartId }).then(parseCart),
  quote: (network: Network, signal?: AbortSignal) =>
    http.get('/quote', { params: { network }, signal }).then((r) => quoteSchema.parse(r.data)),
}
