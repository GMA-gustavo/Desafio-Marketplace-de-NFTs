import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import {
  CircleAlert,
  Download,
  Heart,
  LogOut,
  MapPin,
  ShoppingCart,
  TrendingUp,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Container } from '@/components/layout/container'
import { logout } from '@/features/auth/session'
import { notifyComingSoon } from '@/lib/coming-soon'
import { cn } from '@/lib/utils'

const itemClass =
  'flex shrink-0 items-center gap-2.5 border-l-4 border-transparent px-3 py-2.5 text-body-lg whitespace-nowrap text-primary transition-colors hover:bg-surface-raised aria-[current=page]:border-primary aria-[current=page]:bg-surface-raised md:px-2'

const LINKS = [
  { to: '/perfil', label: 'Dados do perfil', Icon: User },
  { to: '/perfil/carteiras', label: 'Carteiras', Icon: MapPin },
] as const

const SOON = [
  { label: 'Atividade', Icon: ShoppingCart },
  { label: 'Ofertas', Icon: TrendingUp },
  { label: 'Arquivos baixados', Icon: Download },
  { label: 'Suporte', Icon: CircleAlert },
]

/** Layout "Meu perfil" (frames Desktop / Perfil e Carteiras). No mobile vira abas roláveis. */
export function ProfileShell({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navRef = useRef<HTMLElement>(null)

  // No mobile as abas rolam na horizontal: mantém a aba ativa visível.
  useEffect(() => {
    navRef.current
      ?.querySelector(`a[href="${pathname}"]`)
      ?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [pathname])

  return (
    <Container className="pt-4 pb-24 md:pt-6 md:pb-12">
      <div className="grid gap-6 md:grid-cols-[253px_1fr] md:gap-6">
        <nav
          ref={navRef}
          aria-label="Meu perfil"
          className="min-w-0 md:self-start md:bg-surface-card"
        >
          <h2 className="hidden px-2 pt-4 pb-2 text-title font-bold md:block">Meu perfil</h2>
          <ul className="-mx-4 flex overflow-x-auto px-4 md:mx-0 md:block md:overflow-visible md:px-0">
            {LINKS.map(({ to, label, Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  activeOptions={{ exact: true }}
                  activeProps={{ 'aria-current': 'page' }}
                  className={itemClass}
                >
                  <Icon className="size-4" aria-hidden /> {label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/favoritos" activeProps={{ 'aria-current': 'page' }} className={itemClass}>
                <Heart className="size-4" aria-hidden /> Lista de interesse
              </Link>
            </li>
            {SOON.map(({ label, Icon }) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => notifyComingSoon(label)}
                  className={cn(itemClass, 'w-full')}
                >
                  <Icon className="size-4" aria-hidden /> {label}
                </button>
              </li>
            ))}
            <li className="md:border-t md:border-border">
              <button
                type="button"
                className={cn(itemClass, 'w-full font-bold')}
                onClick={async () => {
                  await logout(queryClient)
                  toast.success('Você saiu da sua conta.')
                  await router.navigate({ to: '/' })
                }}
              >
                <LogOut className="size-4" aria-hidden /> Sair
              </button>
            </li>
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  )
}
