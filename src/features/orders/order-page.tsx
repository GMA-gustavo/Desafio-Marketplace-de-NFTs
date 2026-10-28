import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ExternalLink, Loader2, RotateCw, X, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { ordersApi } from '@/api/orders'
import { queryKeys } from '@/api/query-keys'
import { Container } from '@/components/layout/container'
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

const PENDING_POLL_MS = 3000

function ThankYouIcon() {
  return (
    <svg
      viewBox="0 0 64 72"
      className="mx-auto h-16 text-primary"
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Recibo: reproduz o snapshot do pedido; mudanças posteriores no catálogo não o alteram. */
function Receipt({ order }: { order: Order }) {
  const navigate = useNavigate()
  return (
    <article
      aria-labelledby="receipt-title"
      className="relative mx-auto max-w-[472px] border-b-8 border-primary bg-surface-card"
    >
      <button
        type="button"
        onClick={() => void navigate({ to: '/' })}
        aria-label="Fechar e voltar ao início"
        className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-primary hover:bg-surface-raised"
      >
        <X className="size-4" aria-hidden />
      </button>
      <div className="px-6 pt-6 pb-4 text-center">
        <ThankYouIcon />
        <h1 id="receipt-title" className="mt-3 text-body-lg font-bold text-text-secondary">
          Seus NFTs agora estão na sua carteira
        </h1>
      </div>
      <dl className="grid grid-cols-2 border-y border-primary px-6 py-3 text-caption sm:grid-cols-4 sm:divide-x sm:divide-primary/60">
        <div className="sm:pr-3">
          <dt className="font-bold">ID da transação</dt>
          <dd className="text-text-secondary">{order.txHash ? shortAddress(order.txHash) : '—'}</dd>
        </div>
        <div className="sm:px-3">
          <dt className="text-text-secondary">Data</dt>
          <dd className="text-text-secondary">{formatDate(order.settledAt ?? order.createdAt)}</dd>
        </div>
        <div className="mt-2 sm:mt-0 sm:px-3">
          <dt className="text-text-secondary">Total</dt>
          <dd className="text-text-secondary">{formatEth(order.total)}</dd>
        </div>
        <div className="mt-2 sm:mt-0 sm:pl-3">
          <dt className="font-bold">Carteira</dt>
          <dd className="text-text-secondary">{WALLET_PROVIDER_LABEL[order.wallet.provider]}</dd>
        </div>
      </dl>
      <div className="space-y-4 px-6 py-5 sm:px-9">
        <h2 className="text-body font-bold">Detalhes da transação</h2>
        <OrderLines lines={order.items} compact />
        <dl className="space-y-1 text-body sm:pl-32">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatEth(order.subtotal)}</dd>
          </div>
          {!eth.isZero(order.discount) && (
            <div className="flex justify-between">
              <dt>Desconto {order.couponCode && `(${order.couponCode})`}</dt>
              <dd className="text-success tabular-nums">(-) {formatEth(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Taxa de rede</dt>
            <dd className="tabular-nums">{formatEth(order.networkFee)}</dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2 font-bold">
            <dt>Total</dt>
            <dd className="text-primary tabular-nums">{formatEth(order.total)}</dd>
          </div>
        </dl>
        <p className="text-center text-caption text-text-secondary">
          Transação confirmada na {NETWORK_LABEL[order.network]}. A propriedade foi transferida para
          sua carteira {order.wallet.label} ({shortAddress(order.wallet.address)}) e registrada na
          rede.
        </p>
        {order.explorerUrl && (
          <div className="text-center">
            <a
              href={order.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ className: 'h-10' })}
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
