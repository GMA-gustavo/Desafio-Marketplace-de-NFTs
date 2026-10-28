import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) =>
      http.get<{ status: string }>('/health', { signal }).then((r) => r.data),
  })

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">KURIO</h1>
      <p>API: {health.isPending ? 'carregando…' : health.isError ? 'erro' : health.data.status}</p>
    </main>
  )
}
