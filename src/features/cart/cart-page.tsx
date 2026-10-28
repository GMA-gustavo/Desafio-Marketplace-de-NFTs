import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, RotateCw, Trash2 } from 'lucide-react'
import { QuantityStepper } from '@/components/form/quantity-stepper'
import { Container } from '@/components/layout/container'
import { Breadcrumb, MobileTopBar } from '@/components/layout/page-chrome'
import { NftImage } from '@/components/nft/nft-image'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { CartItem, Quote, QuoteLineStatus } from '@/contracts/cart'
import { EDITION_LABEL } from '@/contracts/nft'
import { NftRow } from '@/features/catalog/nft-row'
import { errorMessage } from '@/lib/api-error'
import { eth, formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { CouponForm, QuoteSummary } from './cart-summary'
import { useCart } from './use-cart'
import {
  useAcknowledgePrices,
  useQuote,
  useRemoveCartItem,
  useUpdateCartItem,
} from './use-cart-mutations'

function lineStatus(quote: Quote | undefined, itemId: string): QuoteLineStatus {
  return quote?.lines.find((l) => l.itemId === itemId)?.status ?? 'ok'
}

function ItemNotice({ item, status }: { item: CartItem; status: QuoteLineStatus }) {
  if (status === 'sold_out') {
    return (
      <p className="text-caption text-destructive">
        Edição esgotada — remova este item para continuar.
      </p>
    )
  }
  if (status === 'insufficient') {
    return (
      <p className="text-caption text-destructive">
        Só {item.maxPerOrder} disponíveis — reduza a quantidade.
      </p>
    )
  }
  if (item.previousUnitPrice) {
    const up = eth.cmp(item.unitPrice, item.previousUnitPrice) > 0
    return (
      <p className="text-caption text-amber">
        Preço {up ? 'subiu' : 'caiu'}: de {formatEth(item.previousUnitPrice)} para{' '}
        {formatEth(item.unitPrice)}
      </p>
    )
  }
  return null
}

function useItemActions(item: CartItem) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const busy = update.isPending || remove.isPending
  return {
    busy,
    setQuantity: (quantity: number) =>
      update.mutate({ itemId: item.id, quantity, name: item.name }),
    remove: () => remove.mutate({ itemId: item.id, name: item.name }),
  }
}

function DesktopRow({ item, status }: { item: CartItem; status: QuoteLineStatus }) {
  const actions = useItemActions(item)
  const lineTotal = eth.mul(item.unitPrice, item.quantity)
  return (
    <tr className={cn('bg-surface-card', actions.busy && 'opacity-70')} aria-busy={actions.busy}>
      <td className="py-1.5 pl-0">
        <div className="flex items-center gap-3">
          <Link
            to="/nft/$nftId"
            params={{ nftId: item.nftId }}
            search={{ edition: item.editionId }}
            className="w-14 shrink-0"
            tabIndex={-1}
            aria-hidden
          >
            <NftImage art={item.art} alt="" sizes="56px" />
          </Link>
          <div className="min-w-0">
            <Link
              to="/nft/$nftId"
              params={{ nftId: item.nftId }}
              search={{ edition: item.editionId }}
              className="block truncate text-body-lg font-bold hover:text-primary"
            >
              {item.name}
            </Link>
            <p className="text-caption text-text-secondary">
              ID do token: {item.tokenId} · Edição {EDITION_LABEL[item.editionId]}
            </p>
            <ItemNotice item={item} status={status} />
          </div>
        </div>
      </td>
      <td className="font-bold text-text-secondary tabular-nums">{formatEth(item.unitPrice)}</td>
      <td>
        <QuantityStepper
          size="sm"
          value={item.quantity}
          max={item.maxPerOrder}
          onChange={actions.setQuantity}
          label={item.name}
          disabled={actions.busy}
        />
      </td>
      <td className="font-bold text-primary tabular-nums">{formatEth(lineTotal)}</td>
      <td className="pr-4 text-right">
        <button
          type="button"
          onClick={actions.remove}
          disabled={actions.busy}
          aria-label={`Remover ${item.name} do carrinho`}
          className="grid size-8 place-items-center rounded-full text-text-secondary hover:bg-surface-raised hover:text-primary"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </td>
    </tr>
  )
}

function MobileItem({ item, status }: { item: CartItem; status: QuoteLineStatus }) {
  const actions = useItemActions(item)
  return (
    <li className={cn('flex gap-3 rounded-2xl bg-surface-card p-2', actions.busy && 'opacity-70')}>
      <Link
        to="/nft/$nftId"
        params={{ nftId: item.nftId }}
        className="w-20 shrink-0"
        tabIndex={-1}
        aria-hidden
      >
        <NftImage art={item.art} alt="" sizes="80px" className="rounded-xl" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-body-lg font-bold">{item.name}</p>
            <p className="text-caption text-text-secondary">
              Edição: {EDITION_LABEL[item.editionId]}
            </p>
          </div>
          <button
            type="button"
            onClick={actions.remove}
            disabled={actions.busy}
            aria-label={`Remover ${item.name} do carrinho`}
            className="grid size-7 shrink-0 place-items-center rounded-full text-primary"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
        <ItemNotice item={item} status={status} />
        <div className="flex items-center justify-between">
          <p className="text-body-lg font-bold text-primary">
            {formatEth(eth.mul(item.unitPrice, item.quantity))}
          </p>
          <QuantityStepper
            size="sm"
            value={item.quantity}
            max={item.maxPerOrder}
            onChange={actions.setQuantity}
            label={item.name}
            disabled={actions.busy}
          />
        </div>
      </div>
    </li>
  )
}

function CartSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando carrinho…
      </span>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-[68px] w-full rounded-sm" />
      ))}
    </div>
  )
}

export function CartPage() {
  const cart = useCart()
  const items = cart.data?.items ?? []
  const quote = useQuote('ethereum', items.length > 0)
  const acknowledge = useAcknowledgePrices()
  const navigate = useNavigate()

  const changed = items.filter((i) => i.previousUnitPrice)
  const blocked = quote.data ? !quote.data.valid : false
  const quoteLoading = quote.isPending || (quote.isFetching && !quote.data)

  const summary = (variant: 'desktop' | 'mobile') => (
    <div className="space-y-5">
      <CouponForm couponCode={cart.data?.couponCode ?? null} quote={quote.data} variant={variant} />
      {quote.isError ? (
        <div role="alert" className="space-y-2 text-body">
          <p className="text-destructive">
            Não foi possível calcular os valores. {errorMessage(quote.error)}
          </p>
          <Button size="sm" variant="outline" onClick={() => void quote.refetch()}>
            <RotateCw aria-hidden /> Tentar novamente
          </Button>
        </div>
      ) : (
        <QuoteSummary quote={quote.data} isLoading={quoteLoading} />
      )}
      {blocked && (
        <p role="alert" className="text-caption text-destructive">
          Ajuste os itens indisponíveis para continuar.
        </p>
      )}
      <Button
        size="lg"
        className={cn('w-full', variant === 'mobile' && 'rounded-full')}
        disabled={!quote.data || blocked || quote.isFetching}
        onClick={() => void navigate({ to: '/pagamento' })}
      >
        Conectar e finalizar
      </Button>
      {variant === 'desktop' && (
        <Link
          to="/"
          hash="catalogo"
          className="block text-center text-body text-primary hover:underline"
        >
          Continuar explorando
        </Link>
      )}
    </div>
  )

  return (
    <Container className="md:pt-6">
      <MobileTopBar title="Carrinho de NFTs" />
      <Breadcrumb
        className="hidden md:block"
        items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Carrinho' }]}
      />
      <h1 className="sr-only md:not-sr-only md:mt-4 md:text-heading-sm md:font-bold">
        Carrinho de NFTs
      </h1>

      {changed.length > 0 && (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-amber/50 bg-amber/10 px-4 py-3"
        >
          <p className="flex items-center gap-2 text-body">
            <AlertTriangle className="size-4 text-amber" aria-hidden />
            {changed.length === 1
              ? `O preço de ${changed[0]!.name} mudou desde que você o adicionou.`
              : `${changed.length} itens mudaram de preço desde que foram adicionados.`}{' '}
            O resumo já mostra os valores atualizados.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => acknowledge.mutate()}
            disabled={acknowledge.isPending}
          >
            Entendi
          </Button>
        </div>
      )}

      {cart.isError && !cart.data ? (
        <div
          role="alert"
          className="mt-8 grid place-items-center gap-3 rounded-sm bg-surface-card px-6 py-16 text-center"
        >
          <p className="text-title font-bold">Não foi possível carregar o carrinho</p>
          <p className="text-text-secondary">{errorMessage(cart.error)}</p>
          <Button onClick={() => void cart.refetch()}>
            <RotateCw aria-hidden /> Tentar novamente
          </Button>
        </div>
      ) : !cart.isPending && items.length === 0 ? (
        <div className="mt-8 grid place-items-center gap-3 rounded-sm bg-surface-card px-6 py-16 text-center">
          <p className="text-title font-bold">Seu carrinho está vazio</p>
          <p className="max-w-sm text-text-secondary">
            Explore o mercado e adicione NFTs para começar sua coleção.
          </p>
          <Link to="/" hash="catalogo" className={buttonVariants()}>
            Explorar NFTs
          </Link>
        </div>
      ) : (
        <div className="mt-2 grid gap-10 md:mt-4 lg:grid-cols-[1fr_271px] lg:gap-16">
          <div className="min-w-0">
            {cart.isPending ? (
              <CartSkeleton />
            ) : (
              <>
                <table className="hidden w-full border-separate border-spacing-y-2 text-left md:table">
                  <caption className="sr-only">Itens no carrinho</caption>
                  <thead>
                    <tr className="text-body-lg font-bold">
                      <th scope="col" className="border-b border-border pb-2">
                        NFTs
                      </th>
                      <th scope="col" className="border-b border-border pb-2">
                        Preço
                      </th>
                      <th scope="col" className="border-b border-border pb-2">
                        Edições
                      </th>
                      <th scope="col" className="border-b border-border pb-2">
                        Total
                      </th>
                      <th scope="col" className="border-b border-border pb-2">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <DesktopRow
                        key={item.id}
                        item={item}
                        status={lineStatus(quote.data, item.id)}
                      />
                    ))}
                  </tbody>
                </table>
                <ul className="space-y-3 md:hidden" aria-label="Itens no carrinho">
                  {items.map((item) => (
                    <MobileItem
                      key={item.id}
                      item={item}
                      status={lineStatus(quote.data, item.id)}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>

          <aside aria-labelledby="resumo" className="md:self-start">
            <h2
              id="resumo"
              className="hidden border-b border-border pb-2 text-title font-bold md:block"
            >
              Resumo do pedido
            </h2>
            <div className="mt-0 rounded-t-3xl bg-surface-card px-4 py-6 md:mt-5 md:rounded-none md:bg-transparent md:p-0">
              <div className="hidden md:block">{summary('desktop')}</div>
              <div className="md:hidden">{summary('mobile')}</div>
            </div>
          </aside>
        </div>
      )}

      <div className="mt-16 hidden md:block">
        <NftRow title="Colecionadores também viram" query={{ tab: 'trending', sort: 'recent' }} />
      </div>
    </Container>
  )
}
