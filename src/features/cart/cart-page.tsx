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
    // Cart Item do Figma: linha de 70 px, miniatura colada à esquerda e colunas em space-between.
    <tr className={cn('bg-surface-card', actions.busy && 'opacity-70')} aria-busy={actions.busy}>
      <td className="p-0">
        <div className="flex min-h-[70px] items-center gap-4">
          <Link
            to="/nft/$nftId"
            params={{ nftId: item.nftId }}
            search={{ edition: item.editionId }}
            className="w-[70px] shrink-0 self-start"
            tabIndex={-1}
            aria-hidden
          >
            <NftImage art={item.art} alt="" sizes="70px" className="rounded-md" />
          </Link>
          <div className="min-w-0 py-2">
            <Link
              to="/nft/$nftId"
              params={{ nftId: item.nftId }}
              search={{ edition: item.editionId }}
              className="block truncate text-body-lg leading-4 font-bold hover:text-primary"
            >
              {item.name}
            </Link>
            <p className="mt-1.5 text-body leading-4 text-text-muted">
              ID do token: {item.tokenId}
            </p>
            <p className="mt-1 text-caption leading-4 text-text-muted">
              Edição {EDITION_LABEL[item.editionId]}
            </p>
            <ItemNotice item={item} status={status} />
          </div>
        </div>
      </td>
      <td className="text-body-lg leading-4 font-bold text-text-secondary tabular-nums">
        {formatEth(item.unitPrice)}
      </td>
      <td>
        <QuantityStepper
          size="pill"
          value={item.quantity}
          max={item.maxPerOrder}
          onChange={actions.setQuantity}
          label={item.name}
          disabled={actions.busy}
        />
      </td>
      <td className="text-body-lg leading-4 font-bold text-text-accent tabular-nums">
        {formatEth(lineTotal)}
      </td>
      <td className="pr-6">
        <button
          type="button"
          onClick={actions.remove}
          disabled={actions.busy}
          aria-label={`Remover ${item.name} do carrinho`}
          className="relative grid size-6 place-items-center rounded-sm text-text-muted after:absolute after:-inset-1 hover:text-primary"
        >
          <Trash2 className="size-6" strokeWidth={1.5} aria-hidden />
        </button>
      </td>
    </tr>
  )
}

function MobileItem({ item, status }: { item: CartItem; status: QuoteLineStatus }) {
  const actions = useItemActions(item)
  return (
    // Item do frame mobile: 100 px de altura, raio de 14 px, sombra e arte colada à esquerda.
    <li
      className={cn(
        'flex min-h-[100px] gap-2 overflow-hidden rounded-[14px] bg-surface-card shadow-[0_6px_20px_rgba(10,6,4,0.45)]',
        actions.busy && 'opacity-70',
      )}
    >
      <Link
        to="/nft/$nftId"
        params={{ nftId: item.nftId }}
        className="w-[100px] shrink-0"
        tabIndex={-1}
        aria-hidden
      >
        <NftImage art={item.art} alt="" sizes="100px" className="h-full rounded-l-[14px]" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-[13px] pr-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[15px] leading-4 font-bold">{item.name}</p>
            <p className="mt-1.5 text-body leading-4 text-text-secondary">
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
          <p className="text-[18px] leading-4 font-bold text-text-accent">
            {formatEth(eth.mul(item.unitPrice, item.quantity))}
          </p>
          <QuantityStepper
            size="round"
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
    <div className="space-y-5 md:space-y-6">
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
        className={cn(
          'w-full',
          variant === 'mobile'
            ? 'rounded-full'
            : 'h-10 rounded-[3px] text-[15px] leading-4 font-bold',
        )}
        disabled={!quote.data || blocked || quote.isFetching}
        onClick={() => void navigate({ to: '/pagamento' })}
      >
        Conectar e finalizar
      </Button>
      {variant === 'desktop' && (
        <Link
          to="/"
          hash="catalogo"
          className="-mt-3 block text-center text-[15px] leading-5 text-text-accent hover:underline"
        >
          Continuar explorando
        </Link>
      )}
    </div>
  )

  return (
    <Container className="md:pt-8">
      <MobileTopBar title="Carrinho de NFTs" className="pt-8 [&_h1]:leading-4" />
      <Breadcrumb
        className="hidden md:block"
        items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Carrinho' }]}
      />
      {/* O frame desktop não mostra título: ele fica só para leitores de tela (no mobile o título é o da barra). */}
      <h1 className="hidden md:sr-only md:block">Carrinho de NFTs</h1>

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
        <div className="mt-2 grid gap-10 md:mt-3 lg:grid-cols-[minmax(0,782px)_332px] lg:justify-between lg:gap-8">
          <div className="min-w-0">
            {cart.isPending ? (
              <CartSkeleton />
            ) : (
              <>
                <table className="-mt-3 hidden w-full table-fixed border-separate border-spacing-y-3 text-left md:table">
                  <caption className="sr-only">Itens no carrinho</caption>
                  {/* Colunas de 250/77/75/87/24 px distribuídas em 782 px, como no Figma. */}
                  <colgroup>
                    <col className="w-[39.8%]" />
                    <col className="w-[17.7%]" />
                    <col className="w-[17.4%]" />
                    <col className="w-[19%]" />
                    <col className="w-[6.1%]" />
                  </colgroup>
                  <thead>
                    <tr className="text-body-lg leading-4">
                      <th scope="col" className="border-b border-primary/30 pb-3 font-bold">
                        NFTs
                      </th>
                      <th scope="col" className="border-b border-primary/30 pb-3 font-medium">
                        Preço
                      </th>
                      <th scope="col" className="border-b border-primary/30 pb-3 font-bold">
                        Edições
                      </th>
                      <th scope="col" className="border-b border-primary/30 pb-3 font-medium">
                        Total
                      </th>
                      <th scope="col" className="border-b border-primary/30 pb-3">
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
                <ul className="space-y-5 md:hidden" aria-label="Itens no carrinho">
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
              className="hidden border-b border-primary/30 pb-3 text-[18px] leading-4 font-bold md:block"
            >
              Resumo do pedido
            </h2>
            {/* Payment Summary do frame mobile: painel de ponta a ponta com raio de 40 px. */}
            <div className="-mx-6 mt-0 rounded-t-[40px] bg-surface-card px-6 pt-6 pb-9 md:mx-0 md:mt-6 md:rounded-none md:bg-transparent md:p-0">
              <div className="hidden md:block">{summary('desktop')}</div>
              <div className="md:hidden">{summary('mobile')}</div>
            </div>
          </aside>
        </div>
      )}

      <div className="mt-16 hidden md:block lg:mt-24">
        <NftRow title="Colecionadores também viram" query={{ tab: 'trending', sort: 'recent' }} />
      </div>
    </Container>
  )
}
