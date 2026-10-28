import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { NftImage } from '@/components/nft/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import type { NftSummary } from '@/contracts/nft'
import { useFavorites, useToggleFavorite } from '@/features/favorites/use-favorites'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

interface NftCardProps {
  nft: NftSummary
  sizes?: string
  priority?: boolean
  /** Mostra o coração sobre a imagem (como no frame mobile). */
  showFavorite?: 'always' | 'mobile' | 'never'
}

export function NftCard({
  nft,
  sizes = '(min-width: 1024px) 240px, 45vw',
  priority,
  showFavorite = 'mobile',
}: NftCardProps) {
  const favorites = useFavorites()
  const { toggle } = useToggleFavorite()
  const isFavorite = favorites.data?.ids.includes(nft.id) ?? false
  const soldOut = nft.available === 0

  return (
    <article className="group relative">
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        className="block rounded-sm focus-visible:outline-offset-4"
      >
        <div className="relative bg-surface-card p-1">
          <NftImage
            art={nft.art}
            alt=""
            sizes={sizes}
            priority={priority}
            className={cn(
              'rounded-lg transition-transform duration-300 group-hover:scale-[1.02]',
              soldOut && 'opacity-60',
            )}
          />
          {nft.rarity === 'raro' && (
            <span className="absolute top-1 left-0 bg-primary px-3 py-1 text-caption font-bold text-ink">
              RARO
            </span>
          )}
          {soldOut && (
            <span className="absolute right-2 bottom-2 rounded-sm bg-ink/90 px-2 py-1 text-caption font-bold">
              Esgotado
            </span>
          )}
        </div>
        <h3 className="mt-3 truncate text-body-lg text-foreground">{nft.name}</h3>
        <p className="text-body-lg">
          <span className="font-bold text-primary">{formatEth(nft.price)}</span>
          {nft.compareAtPrice && (
            <>
              {' '}
              <span className="sr-only">preço anterior</span>
              <s className="text-text-secondary">{formatEth(nft.compareAtPrice)}</s>
            </>
          )}
        </p>
      </Link>
      {showFavorite !== 'never' && (
        <button
          type="button"
          onClick={() => toggle(nft.id, nft.name, isFavorite)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
          className={cn(
            'absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-ink/80 text-primary transition-colors hover:bg-ink',
            showFavorite === 'mobile' && 'md:hidden',
          )}
        >
          <Heart className={cn('size-4', isFavorite && 'fill-current')} aria-hidden />
        </button>
      )}
    </article>
  )
}

/** Mesmas dimensões do card real para não haver deslocamento de layout. */
export function NftCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="bg-surface-card p-1">
        <Skeleton className="aspect-square w-full rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-1.5 h-5 w-1/3" />
    </div>
  )
}
