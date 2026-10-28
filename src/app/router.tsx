import { createRouter, parseSearchWith, stringifySearchWith } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { routeTree } from '@/routeTree.gen'

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    // URLs legíveis: listas como "a,b" e valores crus; cada rota valida e converte com zod.
    parseSearch: parseSearchWith((value) => value),
    stringifySearch: stringifySearchWith((value) =>
      Array.isArray(value) ? value.join(',') : String(value),
    ),
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
  interface StaticDataRouteOption {
    /** Esconde a barra inferior e o rodapé no mobile (telas com CTA fixo ou tela cheia). */
    hideMobileChrome?: boolean
  }
}
