import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'

export const Route = createFileRoute('/pedidos/$orderId')({
  component: () => <PagePlaceholder title="Pedido" />,
})
