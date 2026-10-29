import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ExternalLink, Loader2, RotateCw, X, XCircle } from 'lucide-react'
import { Fragment, useEffect } from 'react'
import { ordersApi } from '@/api/orders'
import { queryKeys } from '@/api/query-keys'
import { Container } from '@/components/layout/container'
import { NftImage } from '@/components/nft/nft-image'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NETWORK_LABEL, WALLET_PROVIDER_LABEL } from '@/contracts/common'
import type { Order } from '@/contracts/order'
import { useSession } from '@/features/auth/session'
import { OrderLines } from '@/features/checkout/order-lines'
import { errorMessage, toApiError } from '@/lib/api-error'
import { shortAddress } from '@/lib/format'
import { eth, formatEth } from '@/lib/money'
import { storage } from '@/lib/storage'
import { cn } from '@/lib/utils'

const PENDING_POLL_MS = 3000

function ThankYouIcon() {
  return (
    <svg
      viewBox="0 0 64 72"
      className="mx-auto size-20 text-primary"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M6 28 32 8l26 20v38H6Z" strokeLinejoin="round" />
      <path d="M6 28l26 20 26-20" strokeLinejoin="round" />
      <rect x="14" y="16" width="36" height="24" rx="2" fill="var(--kurio-surface-card)" />
      <text
        x="32"
        y="26"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        THANK
      </text>
      <text
        x="32"
        y="35"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        YOU
      </text>
    </svg>
  )
}

/** "29 Out, 2026": formato curto do recibo no Figma ("29 Jul, 2026"), com o mês em português. */
function formatDate(iso: string) {
  const date = new Date(iso)
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  const day = String(date.getDate()).padStart(2, '0')
  return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${date.getFullYear()}`
}

/** Recibo: reproduz o snapshot do pedido; mudanças posteriores no catálogo não o alteram. */
function Receipt({ order }: { order: Order }) {
  const navigate = useNavigate()
  const meta = [
    {
      term: 'ID da transação',
      value: order.txHash ? shortAddress(order.txHash) : '—',
      strong: true,
    },
    { term: 'Data', value: formatDate(order.settledAt ?? order.createdAt) },
    { term: 'Total', value: formatEth(order.total) },
    { term: 'Carteira', value: WALLET_PROVIDER_LABEL[order.wallet.provider], strong: true },
  ]
  return (
    // Order Confirmation Modal do Figma: 578 px, cabeçalho de 156 px e faixa de metadados.
    <article
      aria-labelledby="receipt-title"
      className="relative mx-auto max-w-[578px] bg-surface-card"
    >
      <button
        type="button"
        onClick={() => void navigate({ to: '/' })}
        aria-label="Fechar e voltar ao início"
        className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-primary hover:bg-surface-raised"
      >
        <X className="size-4" aria-hidden />
      </button>
      <div className="flex flex-col items-center gap-4 px-6 py-[22px] text-center">
        <ThankYouIcon />
        <h1 id="receipt-title" className="text-body-lg leading-4 font-bold text-text-secondary">
          Seus NFTs agora estão na sua carteira
        </h1>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-y border-primary px-6 py-3 text-text-secondary sm:flex sm:h-[67px] sm:items-center sm:justify-between sm:gap-0 sm:px-9 sm:py-1">
        {meta.map((item, i) => (
          <Fragment key={item.term}>
            {i > 0 && <span aria-hidden className="hidden h-[31px] w-px bg-primary sm:block" />}
            <div>
              <dt className={cn('text-body leading-4', item.strong && 'font-bold')}>{item.term}</dt>
              <dd className="text-[15px] leading-5">{item.value}</dd>
            </div>
          </Fragment>
        ))}
      </dl>
      <div className="space-y-3 px-6 pt-5 pb-12 sm:px-11">
        <h2 className="text-[15px] leading-4 font-bold">Detalhes da transação</h2>
        <table className="w-full text-left">
          <caption className="sr-only">Itens comprados</caption>
          <thead>
            <tr className="text-body-lg leading-4">
              <th scope="col" className="border-b border-primary/30 pb-3 font-bold">
                NFTs
              </th>
              <th scope="col" className="w-[91px] border-b border-primary/30 pb-3 font-bold">
                Edições
              </th>
              <th
                scope="col"
                className="w-[103px] border-b border-primary/30 pb-3 text-right font-medium"
              >
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((line) => (
              <tr key={`${line.nftId}-${line.editionId}`}>
                <td className="pt-3">
                  <div className="flex items-center gap-3">
                    <NftImage
                      art={line.art}
                      alt=""
                      sizes="70px"
                      className="w-14 rounded-lg sm:w-[70px]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-body-lg leading-4 font-bold">{line.name}</p>
                      <p className="mt-1.5 text-body leading-4 text-text-muted">
                        ID do token: {line.tokenId}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="pt-3 text-body leading-4 text-text-secondary">
                  (x {line.quantity})
                </td>
                <td className="pt-3 text-right text-[18px] leading-4 font-bold whitespace-nowrap text-text-accent tabular-nums">
                  {formatEth(line.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto max-w-[321px] space-y-3 pt-3 text-[15px] leading-5">
          {!eth.isZero(order.discount) && (
            <div className="flex items-center justify-between">
              <dt>Desconto {order.couponCode && `(${order.couponCode})`}</dt>
              <dd className="text-success tabular-nums">(-) {formatEth(order.discount)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between">
            <dt>Taxa de rede</dt>
            <dd className="text-[18px] leading-4 tabular-nums">{formatEth(order.networkFee)}</dd>
          </div>
          <div className="flex items-center justify-between font-bold">
            <dt className="text-body-lg leading-4">Total</dt>
            <dd className="text-[18px] leading-4 text-text-accent tabular-nums">
              {formatEth(order.total)}
            </dd>
          </div>
        </dl>
        <div className="flex min-h-[134px] flex-col items-center justify-between gap-4 border-t border-primary/30 pt-3 text-center">
          <p className="text-body leading-[22px] text-text-secondary">
            Transação confirmada na {NETWORK_LABEL[order.network]}. A propriedade foi transferida
            para sua carteira {order.wallet.label} ({shortAddress(order.wallet.address)}) e
            registrada na rede.
          </p>
          {order.explorerUrl && (
            <div>
              <a
                href={order.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  className: 'h-10 rounded-md px-3.5 text-body-lg leading-5',
                })}
              >
                Ver no Etherscan <ExternalLink aria-hidden />
                <span className="sr-only">(abre em nova aba; transação simulada)</span>
              </a>
              <p className="mt-2 text-tiny text-text-secondary">
                Referência simulada: o hash não existe na rede real.
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function PendingState({ order }: { order: Order }) {
  return (
    <div
      className="mx-auto max-w-[472px] space-y-5 bg-surface-card p-6 text-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="mx-auto size-10 animate-spin text-primary" aria-hidden />
      <h1 className="text-title font-bold">Aguardando confirmação do pagamento</h1>
      <p className="text-body text-text-secondary">
        Seu pedido foi registrado e está sendo confirmado na {NETWORK_LABEL[order.network]}. Você
        pode recarregar a página ou fechar o navegador: o status é retomado automaticamente, sem
        criar outra compra.
      </p>
      <div className="text-left">
        <OrderLines lines={order.items} compact />
      </div>
      <p className="font-bold">
        Total: <span className="text-primary">{formatEth(order.total)}</span>
      </p>
    </div>
  )
}

function RejectedState({ order }: { order: Order }) {
  return (
    <div className="mx-auto max-w-[472px] space-y-4 bg-surface-card p-6 text-center" role="alert">
      <XCircle className="mx-auto size-10 text-destructive" aria-hidden />
      <h1 className="text-title font-bold">Pagamento recusado</h1>
      <p className="text-body text-text-secondary">
        {order.failureReason ?? 'A transação não foi concluída.'} Nenhum valor foi cobrado e os
        itens continuam no seu carrinho.
      </p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/carrinho" className={buttonVariants({ variant: 'outline' })}>
          Voltar ao carrinho
        </Link>
        <Link to="/pagamento" className={buttonVariants()}>
          Tentar novamente
        </Link>
      </div>
    </div>
  )
}

export function OrderPage({ orderId }: { orderId: string }) {
  const { user } = useSession()
  const userId = user!.id
  const order = useQuery({
    queryKey: queryKeys.order(userId, orderId),
    queryFn: ({ signal }) => ordersApi.get(orderId, signal),
    // O evento order.updated atualiza na hora; o polling é a rede de segurança enquanto pendente.
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? PENDING_POLL_MS : false),
    retry: (count, error) => toApiError(error).isTransient && count < 2,
  })

  const status = order.data?.status
  useEffect(() => {
    if (status && status !== 'pending' && storage.getPendingOrder()?.orderId === orderId) {
      storage.setPendingOrder(null)
    }
  }, [status, orderId])

  return (
    <Container className="py-10 md:py-16">
      {order.isPending ? (
        <div className="mx-auto max-w-[472px] space-y-4" aria-busy="true">
          <span className="sr-only" role="status">
            Carregando pedido…
          </span>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      ) : order.isError ? (
        <div role="alert" className="mx-auto max-w-[472px] space-y-4 text-center">
          <h1 className="text-title font-bold">
            {toApiError(order.error).status === 403
              ? 'Este pedido pertence a outra conta'
              : toApiError(order.error).status === 404
                ? 'Pedido não encontrado'
                : 'Não foi possível carregar o pedido'}
          </h1>
          <p className="text-text-secondary">{errorMessage(order.error)}</p>
          <div className="flex justify-center gap-3">
            {toApiError(order.error).isTransient && (
              <Button onClick={() => void order.refetch()}>
                <RotateCw aria-hidden /> Tentar novamente
              </Button>
            )}
            <Link to="/" className={buttonVariants({ variant: 'outline' })}>
              Ir para o início
            </Link>
          </div>
        </div>
      ) : order.data.status === 'confirmed' ? (
        <Receipt order={order.data} />
      ) : order.data.status === 'rejected' ? (
        <RejectedState order={order.data} />
      ) : (
        <PendingState order={order.data} />
      )}
    </Container>
  )
}
