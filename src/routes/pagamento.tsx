import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'

export const Route = createFileRoute('/pagamento')({
  component: () => <PagePlaceholder title="Pagamento" />,
})
