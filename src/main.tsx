import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createQueryClient } from '@/app/query-client'
import { createAppRouter } from '@/app/router'
import { env } from '@/lib/env'
import { markNetworkReady } from '@/lib/network-ready'
import './index.css'

function bootstrap() {
  if (env.enableMocks) {
    // O app renderiza sem esperar: requisições e socket aguardam o MSW (ver network-ready.ts).
    import('@/mocks/browser')
      .then(({ startMockWorker }) => startMockWorker())
      .catch((error: unknown) => console.error('Falha ao iniciar a API simulada.', error))
      .finally(markNetworkReady)
  } else {
    markNetworkReady()
  }

  const queryClient = createQueryClient()
  const router = createAppRouter(queryClient)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

bootstrap()
