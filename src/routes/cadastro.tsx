import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'
import { z } from 'zod'

export const Route = createFileRoute('/cadastro')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: () => <PagePlaceholder title="Criar conta" />,
})
