import { createFileRoute, Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { requireAuth } from '@/features/auth/require-auth'
import { NftCard, NftCardSkeleton } from '@/features/catalog/nft-card'
import { useFavorites } from '@/features/favorites/use-favorites'
import { ProfileShell } from '@/features/profile/profile-shell'
import { errorMessage } from '@/lib/api-error'

export const Route = createFileRoute('/favoritos')({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: 'Lista de interesse — Kurio' }] }),
  component: FavoritesPage,
})

function FavoritesPage() {
  const favorites = useFavorites()
  return (
    <ProfileShell>
      <section aria-labelledby="favoritos-title" className="space-y-5">
        <h1 id="favoritos-title" className="text-title font-bold">
          Lista de interesse
        </h1>
        {favorites.isPending ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3" aria-hidden>
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i}>
                <NftCardSkeleton />
              </li>
            ))}
          </ul>
        ) : favorites.isError ? (
          <div role="alert" className="space-y-3">
            <p className="text-destructive">{errorMessage(favorites.error)}</p>
            <Button variant="outline" onClick={() => void favorites.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : favorites.data.items.length === 0 ? (
          <div className="grid place-items-center gap-3 rounded-sm bg-surface-card px-6 py-16 text-center">
            <p className="text-title font-bold">Nenhum favorito ainda</p>
            <p className="max-w-sm text-text-secondary">
              Toque no coração de um NFT para guardá-lo aqui.
            </p>
            <Link to="/" hash="catalogo" className={buttonVariants()}>
              Explorar NFTs
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
            {favorites.data.items.map((nft) => (
              <li key={nft.id}>
                <NftCard nft={nft} showFavorite="always" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </ProfileShell>
  )
}
