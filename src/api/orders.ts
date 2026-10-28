import { z } from 'zod'
import { orderSchema, type CreateOrderInput, type OrderStatus } from '@/contracts/order'
import { http } from '@/lib/http'

export const ordersApi = {
  /** A chave de idempotência identifica a tentativa: reenvios devolvem o mesmo pedido. */
  create: (input: CreateOrderInput, idempotencyKey: string) =>
    http
      .post('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } })
      .then((r) => orderSchema.parse(r.data)),
  get: (id: string, signal?: AbortSignal) =>
    http
      .get(`/orders/${encodeURIComponent(id)}`, { signal })
      .then((r) => orderSchema.parse(r.data)),
  list: (status?: OrderStatus, signal?: AbortSignal) =>
    http
      .get('/orders', { params: { status }, signal })
      .then((r) => z.object({ items: z.array(orderSchema) }).parse(r.data).items),
}
