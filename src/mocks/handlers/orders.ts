import { createOrderInputSchema, orderStatusSchema } from '@/contracts/order'
import { db } from '../db/store'
import { json, MockApiError, parseBody, route } from '../http'
import { requireUser } from '../services/auth'
import { createOrder, settleDueOrders, toOrderDto } from '../services/orders'

export const orderHandlers = [
  route('POST', '/orders', async ({ request }) => {
    const { user } = requireUser(request)
    const key = request.headers.get('Idempotency-Key')
    if (!key) {
      throw new MockApiError('validation_error', 'Cabeçalho Idempotency-Key é obrigatório.')
    }
    const input = await parseBody(request, createOrderInputSchema)
    const { order, replayed } = await createOrder(request, user, input, key)
    return json(toOrderDto(order), { status: replayed ? 200 : 201 })
  }),

  route('GET', '/orders', ({ request, url }) => {
    const { user } = requireUser(request)
    settleDueOrders()
    const status = orderStatusSchema
      .optional()
      .catch(undefined)
      .parse(url.searchParams.get('status') ?? undefined)
    const orders = db.state.orders
      .filter((o) => o.userId === user.id && (!status || o.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toOrderDto)
    return json({ items: orders })
  }),

  route<{ id: string }>('GET', '/orders/:id', ({ request, params }) => {
    const { user } = requireUser(request)
    settleDueOrders()
    const order = db.state.orders.find((o) => o.id === params.id)
    if (!order) throw new MockApiError('not_found', 'Pedido não encontrado.')
    if (order.userId !== user.id) {
      throw new MockApiError('forbidden', 'Você não tem permissão para ver este pedido.')
    }
    return json(toOrderDto(order))
  }),
]
