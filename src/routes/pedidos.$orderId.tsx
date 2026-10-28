import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'
import { requireAuth } from '@/features/auth/require-auth'

export const Route = createFileRoute('/pedidos/$orderId')({
  beforeLoad: requireAuth,
  component: () => <PagePlaceholder title="Pedido" />,
})
