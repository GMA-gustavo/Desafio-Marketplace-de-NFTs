import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return <Outlet />
}

function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <Link to="/" className="mt-4 inline-block text-primary underline">
          Voltar para o início
        </Link>
      </div>
    </main>
  )
}
