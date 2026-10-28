import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'

export const Route = createFileRoute('/favoritos')({
  component: () => <PagePlaceholder title="Lista de interesse" />,
})
