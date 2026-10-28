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
    'text-title font-bold transition-colors hover:text-primary aria-[current=page]:text-primary'
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
      <span aria-hidden className="h-5 w-px bg-primary" />
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
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-b-8 border-primary bg-surface-card p-10 sm:max-w-md">
            <DialogTitle className="sr-only">{copy.title}</DialogTitle>
            <ModeTabs mode={mode} redirect={redirect} />
            <DialogDescription className="text-center text-body text-foreground">
              {copy.description}
            </DialogDescription>
            <Form redirect={redirect} />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <p className="text-center text-heading font-bold tracking-[0.12em]">
        <Link to="/">KURIO</Link>
      </p>
      <h1 className={cn('mt-14 mb-6 text-center text-title font-bold')}>{copy.mobileTitle}</h1>
      <Form redirect={redirect} />
      <p className="mt-10 text-center text-body">
        {mode === 'login' ? (
          <>
            Novo na Kurio?{' '}
            <Link
              to="/cadastro"
              search={{ redirect }}
              replace
              className="text-primary hover:underline"
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
              className="text-primary hover:underline"
            >
              Entre
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
