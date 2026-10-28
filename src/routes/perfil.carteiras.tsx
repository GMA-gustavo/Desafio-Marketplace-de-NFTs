import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'

export const Route = createFileRoute('/perfil/carteiras')({
  component: () => <PagePlaceholder title="Carteiras" />,
})
