import { Link, useRouterState } from '@tanstack/react-router'
import { LogIn, Search, ShoppingCart } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { buttonVariants } from '@/components/ui/button'
import { AccountMenu } from '@/features/auth/account-menu'
import { useSession } from '@/features/auth/session'
import { useCart } from '@/features/cart/use-cart'
import { notifyComingSoon } from '@/lib/coming-soon'
import { cn } from '@/lib/utils'
import { Container } from './container'

const navLinkClass =
  'relative py-2 text-body-lg text-foreground transition-colors hover:text-primary aria-[current=page]:text-primary aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:-bottom-[13px] aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-primary'

const MARKET_PATHS = ['/nft', '/carrinho', '/pagamento', '/pedidos']

export function SiteHeader() {
  const location = useRouterState({ select: (s) => s.location })
  const { user, isPending } = useSession()
  const cart = useCart()
  const cartCount = cart.data?.itemCount ?? 0
  const isMarket = MARKET_PATHS.some((p) => location.pathname.startsWith(p))

  return (
    <header className="hidden md:block">
      <Container>
        <div className="flex h-14 items-center gap-6 border-b border-border">
          <Logo />
          <nav aria-label="Principal" className="mx-auto flex items-center gap-8">
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
          <div className="flex items-center gap-4">
            <Link
              to="/"
              hash="catalogo"
              aria-label="Buscar NFTs"
              className="grid size-9 place-items-center rounded-sm hover:text-primary"
            >
              <Search className="size-5" aria-hidden />
            </Link>
            <Link
              to="/carrinho"
              aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
              className="relative grid size-9 place-items-center rounded-sm hover:text-primary"
            >
              <ShoppingCart className="size-5" aria-hidden />
              {cartCount > 0 && (
                <span
                  aria-hidden
                  className="absolute top-0.5 right-0 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-tiny leading-4 font-bold text-primary-foreground"
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
                className={cn(buttonVariants({ size: 'sm' }), 'h-8 gap-1.5 px-2.5')}
              >
                <LogIn className="size-4" aria-hidden />
                Entrar
              </Link>
            )}
          </div>
        </div>
      </Container>
    </header>
  )
}
