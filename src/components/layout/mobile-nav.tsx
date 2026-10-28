import { Link } from '@tanstack/react-router'
import { Heart, House, ShoppingCart, User, Wallet } from 'lucide-react'

const itemClass =
  'relative grid size-11 place-items-center rounded-full text-text-secondary transition-colors hover:text-primary data-[status=active]:text-primary'

/** Barra inferior do mobile (frame Mobile / Início). Some a partir de md. */
export function MobileNav({ cartCount = 0 }: { cartCount?: number }) {
  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-md items-center justify-between px-6">
        <li>
          <Link to="/" aria-label="Início" className={itemClass} activeOptions={{ exact: true }}>
            <House className="size-5" aria-hidden />
          </Link>
        </li>
        <li>
          <Link to="/favoritos" aria-label="Favoritos" className={itemClass}>
            <Heart className="size-5" aria-hidden />
          </Link>
        </li>
        <li className="-mt-8">
          <Link
            to="/perfil/carteiras"
            aria-label="Carteiras"
            className="grid size-14 place-items-center rounded-full bg-primary text-ink shadow-lg ring-4 ring-ink transition-colors hover:bg-primary-light"
          >
            <Wallet className="size-6" aria-hidden />
          </Link>
        </li>
        <li>
          <Link
            to="/carrinho"
            aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
            className={itemClass}
          >
            <ShoppingCart className="size-5" aria-hidden />
            {cartCount > 0 && (
              <span
                aria-hidden
                className="absolute top-1 right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-tiny leading-4 font-bold text-ink"
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link to="/perfil" aria-label="Perfil" className={itemClass}>
            <User className="size-5" aria-hidden />
          </Link>
        </li>
      </ul>
    </nav>
  )
}
