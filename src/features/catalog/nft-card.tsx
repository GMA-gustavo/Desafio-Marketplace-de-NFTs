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
  /** `row`: cards de 219 px das faixas "Mais desta coleção" (texto menor). */
  variant?: 'grid' | 'row'
}

export function NftCard({
  nft,
  // Largura real do card na grade (2 colunas no celular, 3 a partir de 640 px, coluna de
  // filtros a partir de 1024 px): um valor folgado faria o celular baixar a variante de 640 px.
  sizes = '(min-width: 1024px) 250px, (min-width: 640px) calc(33vw - 25px), calc(50vw - 28px)',
  priority,
  showFavorite = 'mobile',
  variant = 'grid',
}: NftCardProps) {
  const row = variant === 'row'
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
        {/* Desktop: caixa de 258 × 300 com a arte de 250 px centrada, como no Figma. */}
        {/* Mobile: caixa de 200 px com raio de 20 px e gradiente (Frame 412 do Figma). */}
        <div
          className={cn(
            'relative flex items-start rounded-[20px] bg-gradient-to-b from-surface-card to-surface-raised px-1 pt-3 md:aspect-[258/300] md:h-auto md:items-center md:rounded-none md:bg-surface-card md:bg-none md:p-1',
            // Nas faixas o card é mais estreito: a caixa acompanha a arte em vez dos 200 px da grade.
            row ? 'pb-1' : 'h-[200px]',
          )}
        >
          <NftImage
            art={nft.art}
            alt=""
            sizes={sizes}
            priority={priority}
            className={cn(
              'rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]',
              row ? 'md:rounded-[13px]' : 'md:rounded-[15px]',
              soldOut && 'opacity-60',
            )}
          />
          {nft.rarity === 'raro' && (
            // O selo só existe no frame mobile.
            <span className="absolute top-4 left-0 flex h-8 w-[68px] items-center bg-primary pl-2 text-[13px] leading-4 font-medium text-ink md:hidden">
              RARO
            </span>
          )}
          {soldOut && (
            <span className="absolute right-2 bottom-2 rounded-sm bg-ink/90 px-2 py-1 text-caption font-bold">
              Esgotado
            </span>
          )}
        </div>
        <h3
          className={cn(
            'mt-2 truncate pl-2 text-[15px] leading-5 text-foreground md:mt-3 md:pl-0 md:text-body-lg',
            row ? 'md:text-[15px] md:leading-5' : 'md:leading-4',
          )}
        >
          {nft.name}
        </h3>
        <p
          className={cn(
            'pl-2 text-body-lg leading-4 md:pl-0',
            row ? 'md:leading-4' : 'md:mt-3 md:text-[18px] md:leading-4',
          )}
        >
          <span className="font-bold text-text-accent">{formatEth(nft.price)}</span>
          {nft.compareAtPrice && (
            <>
              {' '}
              <span className="sr-only">preço anterior</span>
              <s className="text-text-muted">{formatEth(nft.compareAtPrice)}</s>
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
            'absolute top-3 right-3 grid size-7 place-items-center rounded-full border border-border bg-surface-raised text-primary transition-colors after:absolute after:-inset-2 hover:bg-ink',
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
      <div className="flex h-[200px] items-start rounded-[20px] bg-surface-card px-1 pt-3 md:aspect-[258/300] md:h-auto md:items-center md:rounded-none md:p-1">
        <Skeleton className="aspect-square w-full rounded-2xl md:rounded-[15px]" />
      </div>
      <Skeleton className="mt-3 h-5 w-3/4 md:h-4" />
      <Skeleton className="mt-1.5 h-5 w-1/3 md:mt-3 md:h-4" />
    </div>
  )
}
