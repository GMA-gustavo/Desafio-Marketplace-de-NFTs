import { Link, useNavigate } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { LoginForm, RegisterForm } from './auth-forms'
import { safeRedirect } from './session'

// No desktop o login abre como modal sobre a Home (frames Desktop / Login e Cadastro).
const HomePage = lazy(() => import('@/features/home/home-page'))

const PRIVATE_PREFIXES = ['/pagamento', '/pedidos', '/perfil', '/favoritos']

type Mode = 'login' | 'register'

const COPY: Record<Mode, { title: string; description: string; mobileTitle: string }> = {
  login: {
    title: 'Entrar',
    mobileTitle: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  },
  register: {
    title: 'Criar conta',
    mobileTitle: 'Criar perfil de colecionador',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
}

function ModeTabs({ mode, redirect }: { mode: Mode; redirect?: string }) {
  const tab =
    'text-title leading-4 font-medium transition-colors hover:text-primary aria-[current=page]:text-text-accent'
  return (
    <nav aria-label="Entrar ou criar conta" className="flex items-center justify-center gap-2">
      <Link
        to="/entrar"
        search={{ redirect }}
        replace
        className={tab}
        aria-current={mode === 'login' ? 'page' : undefined}
        activeProps={{ 'aria-current': undefined }}
      >
        Entrar
      </Link>
      <span aria-hidden className="h-5 w-px bg-coral" />
      <Link
        to="/cadastro"
        search={{ redirect }}
        replace
        className={tab}
        aria-current={mode === 'register' ? 'page' : undefined}
        activeProps={{ 'aria-current': undefined }}
      >
        Criar conta
      </Link>
    </nav>
  )
}

export function AuthScreen({ mode, redirect }: { mode: Mode; redirect?: string }) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const navigate = useNavigate()
  const copy = COPY[mode]
  const Form = mode === 'login' ? LoginForm : RegisterForm

  const close = () => {
    const target = safeRedirect(redirect)
    const isPrivate = PRIVATE_PREFIXES.some((p) => target.startsWith(p))
    void navigate({ to: isPrivate ? '/' : target, replace: true })
  }

  if (isDesktop) {
    return (
      <>
        <div aria-hidden inert>
          <Suspense fallback={null}>
            <HomePage />
          </Suspense>
        </div>
        <Dialog open onOpenChange={(open) => !open && close()}>
          {/* Sign In Modal do Figma: 500 × 600, faixa laranja de 10 px na base e recuo de 80 px. */}
          <DialogContent className="block max-h-[calc(100dvh-2rem)] min-h-[600px] gap-0 overflow-y-auto rounded-none border-b-[10px] border-primary bg-surface-card p-0 pt-12 pb-10 ring-0 sm:max-w-[500px]">
            <DialogTitle className="sr-only">{copy.title}</DialogTitle>
            <div className="flex flex-col items-center gap-10 px-12">
              <ModeTabs mode={mode} redirect={redirect} />
              <DialogDescription className="text-center text-[13px] leading-4 text-foreground">
                {copy.description}
              </DialogDescription>
            </div>
            <div className="px-20 pt-6">
              <Form redirect={redirect} dialog />
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    // Frames Mobile / Login e Cadastro: 80 px no topo, logo numa faixa de 136 px e 40 px entre os blocos.
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-7 pt-20 pb-6">
      <p className="grid h-[136px] place-items-center text-[32px] leading-none font-bold tracking-[0.1em]">
        <Link to="/">KURIO</Link>
      </p>
      <h1 className={cn('mt-10 mb-10 text-center text-title leading-4 font-bold')}>
        {copy.mobileTitle}
      </h1>
      <Form redirect={redirect} />
      <p className="mt-10 text-center text-[15px] leading-5 text-text-secondary">
        {mode === 'login' ? (
          <>
            Novo na Kurio?{' '}
            <Link
              to="/cadastro"
              search={{ redirect }}
              replace
              className="text-text-accent hover:underline"
            >
              Crie uma conta
            </Link>
          </>
        ) : (
          <>
            Já tem uma conta?{' '}
            <Link
              to="/entrar"
              search={{ redirect }}
              replace
              className="text-text-accent hover:underline"
            >
              Entre
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
