import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createQueryClient } from '@/app/query-client'
import { createAppRouter } from '@/app/router'
import { env } from '@/lib/env'
import './index.css'

async function bootstrap() {
  if (env.enableMocks) {
    const { startMockWorker } = await import('@/mocks/browser')
    await startMockWorker()
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

void bootstrap()
