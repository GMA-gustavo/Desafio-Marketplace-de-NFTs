import { lazy, Suspense } from 'react'
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  useMatches,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Container } from '@/components/layout/container'
import { MobileNav } from '@/components/layout/mobile-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { buttonVariants } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { SessionWatcher } from '@/features/auth/session-watcher'
import { env } from '@/lib/env'
import { cn } from '@/lib/utils'
import { RealtimeBridge } from '@/realtime/realtime-bridge'

// Carregado sob demanda para não pesar no bundle inicial.
const MockPanel = lazy(() => import('@/features/dev-tools/mock-panel'))

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({ meta: [{ title: 'Kurio — Marketplace de NFTs' }] }),
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const hideMobileChrome = useMatches({
    select: (matches) => matches.some((m) => m.staticData?.hideMobileChrome),
  })

  return (
    <>
      <HeadContent />
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-sm bg-primary px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <div className={cn(hideMobileChrome && 'hidden md:block')}>
        <SiteFooter />
      </div>
      {!hideMobileChrome && <MobileNav />}
      <Toaster position="bottom-right" />
      <SessionWatcher />
      <RealtimeBridge />
      {env.enableMocks && (
        <Suspense fallback={null}>
          <MockPanel />
        </Suspense>
      )}
    </>
  )
}

function NotFound() {
  return (
    <Container className="grid min-h-[50dvh] place-items-center py-16 text-center">
      <div>
        <p className="text-caption font-bold tracking-widest text-primary">ERRO 404</p>
        <h1 className="mt-2 text-heading font-bold">Página não encontrada</h1>
        <p className="mt-2 text-text-secondary">O endereço acessado não existe ou foi removido.</p>
        <Link to="/" className={buttonVariants({ className: 'mt-6' })}>
          Voltar para o início
        </Link>
      </div>
    </Container>
  )
}
