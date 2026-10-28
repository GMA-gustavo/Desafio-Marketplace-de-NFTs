import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/feedback/page-placeholder'
import { z } from 'zod'

export const Route = createFileRoute('/entrar')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: () => <PagePlaceholder title="Entrar" />,
})
