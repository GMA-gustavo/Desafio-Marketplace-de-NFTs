import { Link } from '@tanstack/react-router'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { Wallet } from '@/contracts/account'
import type { Quote } from '@/contracts/cart'
import { NETWORK_LABEL, WALLET_PROVIDER_LABEL } from '@/contracts/common'
import type { CreateOrderInput } from '@/contracts/order'
import { eth, formatEth } from '@/lib/money'
import { QuoteSummary } from '@/features/cart/cart-summary'
import { OrderLines } from './order-lines'
import { shortAddress } from '@/lib/format'

interface ReviewDialogProps {
  open: boolean
  quote: Quote
  body: CreateOrderInput
  wallet: Wallet | undefined
  isSubmitting: boolean
  /** Tentativas automáticas já feitas (timeout/rede) com a mesma chave. */
  retryCount: number
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

export function ReviewDialog({
  open,
  quote,
  body,
  wallet,
  isSubmitting,
  retryCount,
  error,
  onConfirm,
  onClose,
}: ReviewDialogProps) {
  const expires = new Date(quote.expiresAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent
        showCloseButton={!isSubmitting}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-b-8 border-primary bg-surface-card p-6 sm:max-w-lg"
      >
        <DialogTitle className="text-title font-bold">Revise sua compra</DialogTitle>
        <DialogDescription className="text-body text-text-secondary">
          Confira os itens, a carteira e os valores. Esta cotação vale até {expires}.
        </DialogDescription>

        <OrderLines lines={quote.lines} compact />

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-sm bg-surface-raised p-3 text-body">
          <dt className="text-text-secondary">Carteira</dt>
          <dd>
            {wallet
              ? `${wallet.nickname} · ${WALLET_PROVIDER_LABEL[wallet.provider]} · ${shortAddress(wallet.address)}`
              : '—'}
          </dd>
          <dt className="text-text-secondary">Rede</dt>
          <dd>{NETWORK_LABEL[body.network]}</dd>
          <dt className="text-text-secondary">E-mail</dt>
          <dd className="truncate">{body.buyer.email}</dd>
        </dl>

        <QuoteSummary quote={quote} isLoading={false} />

        {error && (
          <p
            role="alert"
            className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-body text-destructive"
          >
            {error}
          </p>
        )}
        {isSubmitting && (
          <p role="status" className="flex items-center gap-2 text-body text-text-secondary">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {retryCount > 0
              ? 'A resposta demorou. Verificando se o pedido já foi criado, sem duplicar a compra…'
              : 'Enviando o pedido para a rede…'}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Voltar e editar
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? 'Processando…' : error ? 'Tentar novamente' : 'Confirmar compra'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Exige nova confirmação quando preço, estoque, cupom ou taxa mudaram na revalidação. */
export function QuoteChangedDialog({
  previous,
  next,
  onAccept,
  onClose,
  isAccepting,
}: {
  previous: Quote
  next: Quote
  onAccept: () => void
  onClose: () => void
  isAccepting: boolean
}) {
  const rows = next.lines.map((line) => {
    const before = previous.lines.find((l) => l.itemId === line.itemId)
    return { line, before }
  })
  const removed = previous.lines.filter((l) => !next.lines.some((n) => n.itemId === l.itemId))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-surface-card p-6 sm:max-w-lg">
        <DialogTitle className="flex items-center gap-2 text-title font-bold">
          <AlertTriangle className="size-5 text-amber" aria-hidden /> Os valores mudaram
        </DialogTitle>
        <DialogDescription className="text-body text-text-secondary">
          Antes de confirmar, conferimos preço, disponibilidade, cupom e taxas. Algo mudou desde a
          sua revisão — confira e confirme novamente.
        </DialogDescription>

        <table className="w-full text-left text-body">
          <caption className="sr-only">Comparação de valores</caption>
          <thead className="text-caption text-text-secondary">
            <tr>
              <th scope="col">Item</th>
              <th scope="col" className="text-right">
                Antes
              </th>
              <th scope="col" className="text-right">
                Agora
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ line, before }) => {
              const changed = !before || !eth.eq(before.unitPrice, line.unitPrice)
              return (
                <tr key={line.itemId} className="border-t border-border">
                  <td className="py-2">
                    {line.name} <span className="text-text-secondary">(x {line.quantity})</span>
                    {line.status === 'sold_out' && (
                      <span className="block text-caption text-destructive">Esgotado</span>
                    )}
                    {line.status === 'insufficient' && (
                      <span className="block text-caption text-destructive">
                        Só {line.available} disponíveis
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {before ? formatEth(before.unitPrice) : '—'}
                  </td>
                  <td
                    className={
                      changed
                        ? 'py-2 text-right font-bold text-amber tabular-nums'
                        : 'py-2 text-right tabular-nums'
                    }
                  >
                    {formatEth(line.unitPrice)}
                  </td>
                </tr>
              )
            })}
            {removed.map((line) => (
              <tr key={line.itemId} className="border-t border-border text-text-secondary">
                <td className="py-2">{line.name} (removido)</td>
                <td className="py-2 text-right">{formatEth(line.unitPrice)}</td>
                <td className="py-2 text-right">—</td>
              </tr>
            ))}
            <tr className="border-t border-border font-bold">
              <td className="py-2">Total</td>
              <td className="py-2 text-right tabular-nums">{formatEth(previous.total)}</td>
              <td className="py-2 text-right text-primary tabular-nums">{formatEth(next.total)}</td>
            </tr>
          </tbody>
        </table>

        {!next.valid && (
          <p role="alert" className="text-body text-destructive">
            Alguns itens ficaram indisponíveis. Ajuste o carrinho para continuar.
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link to="/carrinho" className={buttonVariants({ variant: 'outline' })}>
            Voltar ao carrinho
          </Link>
          {next.valid && (
            <Button onClick={onAccept} disabled={isAccepting}>
              Revisar com novos valores
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
