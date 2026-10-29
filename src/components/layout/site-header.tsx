import { Link, useRouterState } from '@tanstack/react-router'
import { LogOut, Search, ShoppingCart } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { buttonVariants } from '@/components/ui/button'
import { AccountMenu } from '@/features/auth/account-menu'
import { useSession } from '@/features/auth/session'
import { useCart } from '@/features/cart/use-cart'
import { notifyComingSoon } from '@/lib/coming-soon'
import { cn } from '@/lib/utils'
import { Container } from './container'

// Header Row do Figma: 45 px de altura, itens alinhados ao topo; o sublinhado ativo (3 px)
// fica centrado na linha divisória.
const navLinkClass =
  'relative inline-flex h-[45px] items-start text-body-lg leading-[21px] text-foreground transition-colors hover:text-primary aria-[current=page]:font-bold aria-[current=page]:text-text-accent aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:-bottom-[1.5px] aria-[current=page]:after:h-[3px] aria-[current=page]:after:bg-primary'

// Ícones de 20–24 px como no Figma, com área de toque ampliada por um pseudo-elemento.
const iconLinkClass =
  'relative grid place-items-center rounded-sm hover:text-primary after:absolute after:-inset-2'

const MARKET_PATHS = ['/nft', '/carrinho', '/pagamento', '/pedidos']

export function SiteHeader() {
  const location = useRouterState({ select: (s) => s.location })
  const { user, isPending } = useSession()
  const cart = useCart()
  const cartCount = cart.data?.itemCount ?? 0
  const isMarket = MARKET_PATHS.some((p) => location.pathname.startsWith(p))

  return (
    <header className="hidden pt-6 md:block">
      <Container>
        <div
          className={cn(
            'flex items-start justify-between gap-6 border-b',
            // No Figma, as telas do Mercado usam a Header Row sem a linha divisória.
            isMarket ? 'border-transparent' : 'border-primary/30',
          )}
        >
          <div className="lg:w-40">
            <Logo className="mt-2 block leading-[18px]" />
          </div>
          <nav aria-label="Principal" className="flex items-start gap-6 lg:gap-10">
            {/* O estado ativo é calculado aqui: "Mercado" cobre detalhe, carrinho e checkout. */}
            <Link
              to="/"
              className={navLinkClass}
              activeOptions={{ exact: true, includeSearch: false, includeHash: true }}
              activeProps={{ 'aria-current': undefined }}
              aria-current={location.pathname === '/' ? 'page' : undefined}
            >
              Início
            </Link>
            <Link
              to="/"
              hash="catalogo"
              className={navLinkClass}
              activeOptions={{ exact: true, includeSearch: false, includeHash: true }}
              activeProps={{ 'aria-current': undefined }}
              aria-current={isMarket ? 'page' : undefined}
            >
              Mercado
            </Link>
            <button
              type="button"
              className={navLinkClass}
              onClick={() => notifyComingSoon('Criadores')}
            >
              Criadores
            </button>
            <button
              type="button"
              className={navLinkClass}
              onClick={() => notifyComingSoon('Aprenda')}
            >
              Aprenda
            </button>
          </nav>
          <div className="flex h-[35px] items-center gap-7">
            <Link to="/" hash="catalogo" aria-label="Buscar NFTs" className={iconLinkClass}>
              <Search className="size-5" aria-hidden />
            </Link>
            <Link
              to="/carrinho"
              aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
              className={cn(iconLinkClass, 'h-6 w-[31px] justify-items-start')}
            >
              <ShoppingCart className="size-6" aria-hidden />
              {cartCount > 0 && (
                <span
                  aria-hidden
                  className="absolute top-0 right-0 grid min-w-4 place-items-center rounded-full bg-primary px-0.5 text-tiny leading-4 font-medium text-primary-foreground outline-2 outline-ink"
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            {user ? (
              <AccountMenu user={user} />
            ) : (
              <Link
                to="/entrar"
                search={{ redirect: location.href }}
                aria-busy={isPending}
                className={cn(
                  buttonVariants(),
                  'h-[35px] w-[100px] gap-1 rounded-md px-0 text-body-lg font-medium',
                )}
              >
                <LogOut className="size-5" aria-hidden />
                Entrar
              </Link>
            )}
          </div>
        </div>
      </Container>
    </header>
  )
}
