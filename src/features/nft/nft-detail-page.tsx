import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Heart, Mail, RotateCw, Search, ShoppingCart, Star } from 'lucide-react'
import { useState } from 'react'
import { LinkedinIcon, TwitterIcon } from '@/components/brand/social-icons'
import { QuantityStepper } from '@/components/form/quantity-stepper'
import { Container } from '@/components/layout/container'
import { Breadcrumb, MobileTopBar } from '@/components/layout/page-chrome'
import { NftImage } from '@/components/nft/nft-image'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { NETWORK_LABEL } from '@/contracts/common'
import { EDITION_LABEL, type EditionId, type NftDetail } from '@/contracts/nft'
import { useAddToCart } from '@/features/cart/use-cart-mutations'
import { NftRow } from '@/features/catalog/nft-row'
import { useFavorites, useToggleFavorite } from '@/features/favorites/use-favorites'
import { errorMessage, toApiError } from '@/lib/api-error'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { nftQueryOptions } from './nft-query'

function Rating({ value, count }: { value: number; count: number }) {
  return (
    <p className="flex items-center gap-1.5 text-body-lg">
      <span className="flex text-primary" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={cn('size-3.5', i < Math.round(value) && 'fill-current')} />
        ))}
      </span>
      <span className="sr-only">Nota {value.toLocaleString('pt-BR')} de 5,</span>
      {count} avaliações de colecionadores
    </p>
  )
}

function Gallery({ nft }: { nft: NftDetail }) {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(false)
  const art = nft.gallery[active] ?? nft.art
  return (
    <div className="grid gap-4 md:grid-cols-[82px_1fr] lg:gap-6">
      <ul className="hidden flex-col gap-3 md:flex" aria-label="Imagens do NFT">
        {nft.gallery.map((g, i) => (
          <li key={`${g}-${i}`}>
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Ver imagem ${i + 1} de ${nft.gallery.length}`}
              aria-current={active === i ? 'true' : undefined}
              className={cn(
                'block overflow-hidden rounded-sm ring-2 ring-transparent transition',
                active === i && 'ring-primary',
              )}
            >
              <NftImage art={g} alt="" sizes="82px" />
            </button>
          </li>
        ))}
      </ul>
      <div className="relative rounded-sm bg-surface-card p-0 md:p-4">
        <NftImage
          art={art}
          alt={`${nft.name}, da coleção ${nft.collection}`}
          sizes="(min-width: 1024px) 330px, (min-width: 768px) 40vw, 100vw"
          priority
          className="rounded-3xl md:rounded-2xl"
        />
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label="Ampliar imagem"
          className="absolute top-2 right-2 hidden size-8 place-items-center rounded-full bg-ink/80 text-foreground hover:text-primary md:grid"
        >
          <Search className="size-4" aria-hidden />
        </button>
      </div>
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="bg-surface-card p-3 sm:max-w-2xl">
          <DialogTitle className="sr-only">{nft.name} ampliado</DialogTitle>
          <NftImage art={art} alt={nft.name} sizes="672px" className="rounded-lg" />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ShareLinks({ nft }: { nft: NftDetail }) {
  const url = typeof window !== 'undefined' ? window.location.href : ''
  const text = `${nft.name} na Kurio`
  const links = [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      Icon: LinkedinIcon,
    },
    {
      label: 'e-mail',
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
      Icon: Mail,
    },
    {
      label: 'Twitter',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      Icon: TwitterIcon,
    },
  ]
  return (
    <div className="flex items-center gap-3 text-body-lg font-bold">
      Compartilhar este NFT:
      <ul className="flex items-center gap-2">
        {links.map(({ label, href, Icon }) => (
          <li key={label}>
            <a
              href={href}
              target={href.startsWith('mailto') ? undefined : '_blank'}
              rel="noopener noreferrer"
              aria-label={`Compartilhar por ${label}`}
              className="grid size-6 place-items-center hover:text-primary"
            >
              <Icon className="size-4" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Purchase({ nft, editionId }: { nft: NftDetail; editionId: EditionId }) {
  const navigate = useNavigate()
  const addToCart = useAddToCart()
  const favorites = useFavorites()
  const favorite = useToggleFavorite()
  const isFavorite = favorites.data?.ids.includes(nft.id) ?? false
  const edition = nft.editions.find((e) => e.id === editionId)!
  const [quantity, setQuantity] = useState(1)
  const max = edition.maxPerOrder
  // Estoque pode cair em tempo real: a quantidade nunca passa do limite vigente.
  const safeQuantity = Math.max(1, Math.min(quantity, max || 1))
  const soldOut = edition.available === 0

  const add = (then?: () => void) =>
    addToCart.mutate(
      { nftId: nft.id, editionId, quantity: safeQuantity, name: nft.name },
      { onSuccess: then },
    )

  const selectEdition = (id: EditionId) =>
    void navigate({
      to: '/nft/$nftId',
      params: { nftId: nft.id },
      search: { edition: id },
      replace: true,
      resetScroll: false,
    })

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-body-lg font-bold">Edição:</legend>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Edição">
          {nft.editions.map((e) => {
            const selected = e.id === editionId
            const unavailable = e.available === 0
            return (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectEdition(e.id)}
                className={cn(
                  'rounded-full border border-border-soft px-2.5 py-0.5 text-body transition-colors hover:border-primary',
                  selected && 'border-primary font-bold text-primary',
                  unavailable && 'line-through opacity-60',
                )}
              >
                {EDITION_LABEL[e.id]}
                {unavailable && <span className="sr-only"> (esgotada)</span>}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-caption text-text-secondary" aria-live="polite">
          {soldOut
            ? 'Esta edição está esgotada. Escolha outra edição.'
            : `${edition.available} ${edition.available === 1 ? 'disponível' : 'disponíveis'} · máximo de ${max} por pedido`}
        </p>
      </fieldset>

      {/* Desktop: ações inline (frame Desktop / Detalhes do NFT) */}
      <div className="hidden flex-wrap items-center justify-between gap-4 md:flex">
        <QuantityStepper
          value={safeQuantity}
          max={max}
          onChange={setQuantity}
          label={nft.name}
          disabled={soldOut}
        />
        <div className="flex gap-3">
          <Button
            className="h-9 min-w-26 uppercase"
            disabled={soldOut || addToCart.isPending}
            onClick={() => add(() => void navigate({ to: '/carrinho' }))}
          >
            {addToCart.isPending ? 'Adicionando…' : 'Comprar'}
          </Button>
          <Button
            variant="outline"
            className="h-9 border-border-soft font-medium"
            disabled={soldOut || addToCart.isPending}
            onClick={() => add()}
            aria-label="Adicionar ao carrinho"
          >
            <ShoppingCart aria-hidden />
          </Button>
          <Button
            variant="outline"
            className="h-9 font-medium"
            aria-pressed={isFavorite}
            onClick={() => favorite.toggle(nft.id, nft.name, isFavorite)}
          >
            <Heart className={cn(isFavorite && 'fill-current text-primary')} aria-hidden />
            {isFavorite ? 'Favoritado' : 'Favoritar'}
          </Button>
        </div>
      </div>

      {/* Mobile: barra fixa (frame Mobile / Detalhes do NFT) */}
      <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-3xl bg-surface-card px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.4)] md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-body-lg">
            Qtd.
            <QuantityStepper
              size="sm"
              value={safeQuantity}
              max={max}
              onChange={setQuantity}
              label={nft.name}
              disabled={soldOut}
            />
          </div>
          <p className="text-title font-bold text-primary">{formatEth(edition.price)}</p>
        </div>
        <div className="mt-4 flex gap-3">
          <Button
            size="lg"
            className="flex-1 rounded-full"
            disabled={soldOut || addToCart.isPending}
            onClick={() => add(() => void navigate({ to: '/carrinho' }))}
          >
            {soldOut ? 'Edição esgotada' : 'Comprar NFT'}
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="size-11 rounded-full border-border-soft bg-surface-raised text-primary"
            disabled={soldOut || addToCart.isPending}
            onClick={() => add()}
            aria-label="Adicionar ao carrinho"
          >
            <ShoppingCart aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <Container className="py-6" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando NFT…
      </span>
      <div className="grid gap-8 md:grid-cols-[minmax(0,465px)_1fr]">
        <div className="grid gap-4 md:grid-cols-[82px_1fr]">
          <div className="hidden flex-col gap-3 md:flex">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
          <Skeleton className="aspect-square w-full rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </Container>
  )
}

export function NftDetailPage({ nftId, edition }: { nftId: string; edition?: EditionId }) {
  const query = useQuery(nftQueryOptions(nftId))
  const favorites = useFavorites()
  const favorite = useToggleFavorite()

  if (query.isPending) return <DetailSkeleton />

  if (query.isError) {
    const notFound = toApiError(query.error).status === 404
    return (
      <Container className="grid min-h-[50dvh] place-items-center py-16 text-center">
        <div role="alert">
          <p className="text-caption font-bold tracking-widest text-primary">
            {notFound ? 'NFT NÃO ENCONTRADO' : 'ERRO AO CARREGAR'}
          </p>
          <h1 className="mt-2 text-heading font-bold">
            {notFound
              ? 'Este NFT não existe ou foi removido'
              : 'Não foi possível carregar este NFT'}
          </h1>
          <p className="mt-2 text-text-secondary">
            {notFound
              ? 'Confira o endereço ou explore outros NFTs do mercado.'
              : errorMessage(query.error)}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {!notFound && (
              <Button onClick={() => void query.refetch()}>
                <RotateCw aria-hidden /> Tentar novamente
              </Button>
            )}
            <Link
              to="/"
              hash="catalogo"
              className={buttonVariants({ variant: notFound ? 'default' : 'outline' })}
            >
              Explorar o mercado
            </Link>
          </div>
        </div>
      </Container>
    )
  }

  const nft = query.data
  const editionId = nft.editions.some((e) => e.id === edition) ? edition! : nft.defaultEditionId
  const selected = nft.editions.find((e) => e.id === editionId)!
  const isFavorite = favorites.data?.ids.includes(nft.id) ?? false
  const requestedMissing = edition && !nft.editions.some((e) => e.id === edition)

  return (
    <Container className="pb-48 md:pt-6 md:pb-0">
      <MobileTopBar
        fallback="/"
        action={
          <button
            type="button"
            onClick={() => favorite.toggle(nft.id, nft.name, isFavorite)}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
            className="grid size-9 place-items-center rounded-full bg-surface-raised text-primary"
          >
            <Heart className={cn('size-5', isFavorite && 'fill-current')} aria-hidden />
          </button>
        }
      />
      <Breadcrumb
        className="hidden md:block"
        items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: nft.name }]}
      />

      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,465px)_1fr] lg:gap-7">
        <Gallery nft={nft} />
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2 md:block">
            <h1 className="text-heading font-bold md:text-heading-sm lg:text-heading">
              {nft.name}
            </h1>
            <p className="rounded-full border border-primary px-2 py-0.5 text-body md:hidden">
              <Star className="mr-1 inline size-3.5 fill-primary text-primary" aria-hidden />
              {nft.rating.toLocaleString('pt-BR')}
              <span className="text-text-secondary">({nft.reviewCount})</span>
            </p>
          </div>
          <div className="hidden flex-wrap items-center justify-between gap-2 border-b border-border pb-2 md:flex">
            <p className="text-title font-bold text-primary">
              {formatEth(selected.price)}
              {nft.compareAtPrice && (
                <s className="ml-2 text-body-lg font-normal text-text-secondary">
                  {formatEth(nft.compareAtPrice)}
                </s>
              )}
            </p>
            <Rating value={nft.rating} count={nft.reviewCount} />
          </div>
          <section aria-labelledby="sobre">
            <h2 id="sobre" className="hidden text-body-lg font-bold md:block">
              Sobre este NFT:
            </h2>
            <p className="mt-2 text-body text-text-secondary">{nft.description}</p>
          </section>

          {requestedMissing && (
            <p
              role="alert"
              className="rounded-sm bg-destructive/10 px-3 py-2 text-body text-destructive"
            >
              A edição solicitada não existe para este NFT. Mostrando a edição padrão.
            </p>
          )}
          <Purchase key={editionId} nft={nft} editionId={editionId} />

          <dl className="space-y-2 text-body text-text-secondary">
            <div>
              <dt className="inline">ID do token: </dt>
              <dd className="inline">{nft.tokenId}</dd>
            </div>
            <div>
              <dt className="inline">Coleção: </dt>
              <dd className="inline">{nft.collection}</dd>
            </div>
            <div>
              <dt className="inline">Rede: </dt>
              <dd className="inline">{NETWORK_LABEL[nft.network]}</dd>
            </div>
            <div>
              <dt className="inline">Atributos: </dt>
              <dd className="inline">{nft.attributes.join(', ')}</dd>
            </div>
          </dl>
          <div className="hidden md:block">
            <ShareLinks nft={nft} />
          </div>
        </div>
      </div>

      <section aria-labelledby="detalhes" className="mt-12 hidden md:block">
        <div className="flex gap-8 border-b border-border">
          <h2
            id="detalhes"
            className="border-b-2 border-primary pb-2 text-title font-bold text-primary"
          >
            Detalhes do NFT
          </h2>
          <p className="pb-2 text-title">Avaliações de colecionadores ({nft.reviewCount})</p>
        </div>
        <div className="mt-4 space-y-4 text-body text-text-secondary">
          {nft.about.split('\n\n').map((paragraph) => (
            <p key={paragraph.slice(0, 20)}>{paragraph}</p>
          ))}
          <dl className="space-y-3">
            {[
              ['Rede', nft.networkInfo],
              ['Contrato', nft.contractInfo],
              ['Direitos autorais', nft.royaltiesInfo],
            ].map(([term, desc]) => (
              <div key={term}>
                <dt className="font-bold text-foreground">{term}:</dt>
                <dd>{desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mt-16">
        <NftRow
          title="Mais desta coleção"
          query={{ collection: nft.collection, exclude: nft.id }}
        />
      </div>
    </Container>
  )
}
