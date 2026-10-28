import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/require-auth'
import { OrderPage } from '@/features/orders/order-page'

export const Route = createFileRoute('/pedidos/$orderId')({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: 'Seu pedido — Kurio' }] }),
  component: OrderRoute,
})

function OrderRoute() {
  const { orderId } = Route.useParams()
  return <OrderPage orderId={orderId} />
}
