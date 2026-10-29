import { Link } from '@tanstack/react-router'
import { CheckCircle2, Loader2, PlugZap, Unplug } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Wallet } from '@/contracts/account'
import { NETWORK_LABEL, WALLET_PROVIDER_LABEL, type Network } from '@/contracts/common'
import { errorMessage } from '@/lib/api-error'
import { shortAddress } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useWalletConnection, useWalletConnections } from '@/features/wallets/use-wallets'

/** "Carteira e rede": escolhe uma carteira cadastrada e simula conectar/recusar/desconectar. */
export function WalletPicker({
  wallets,
  isLoading,
  selectedId,
  onSelect,
  network,
}: {
  wallets: Wallet[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  network: Network | undefined
}) {
  const connections = useWalletConnections()
  const { connect, disconnect } = useWalletConnection()

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }

  if (!wallets.length) {
    return (
      <div className="rounded-xl border border-dashed border-border-soft p-4 text-body">
        <p>Você ainda não cadastrou uma carteira para receber os NFTs.</p>
        <Link to="/perfil/carteiras" className={buttonVariants({ size: 'sm', className: 'mt-3' })}>
          Cadastrar carteira
        </Link>
      </div>
    )
  }

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Carteira para pagamento</legend>
      {wallets.map((wallet) => {
        const selected = wallet.id === selectedId
        const connection = connections.data?.find((c) => c.walletId === wallet.id)
        const connected = connection?.status === 'connected'
        const connecting = connect.isPending && connect.variables?.walletId === wallet.id
        return (
          <div
            key={wallet.id}
            className={cn(
              'rounded-xl border bg-surface-card p-3 transition-colors md:rounded-[3px] md:bg-transparent',
              selected ? 'border-primary' : 'border-border',
            )}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="wallet"
                value={wallet.id}
                checked={selected}
                onChange={() => onSelect(wallet.id)}
                className="mt-1 size-4 accent-primary"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{wallet.nickname}</span>
                <span className="block truncate text-caption text-text-secondary">
                  {wallet.secondaryAddress ?? shortAddress(wallet.address)}
                </span>
                <span className="block text-caption text-text-secondary">
                  {WALLET_PROVIDER_LABEL[wallet.provider]} · Rede {NETWORK_LABEL[wallet.network]}
                </span>
              </span>
              {connected && (
                <span className="flex items-center gap-1 text-caption text-success">
                  <CheckCircle2 className="size-3.5" aria-hidden /> Conectada
                </span>
              )}
            </label>
            {selected && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {connected ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disconnect.isPending}
                    onClick={() => disconnect.mutate(wallet.id)}
                  >
                    <Unplug aria-hidden /> Desconectar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={connecting || !network}
                    onClick={() =>
                      connect.mutate({ walletId: wallet.id, network: network ?? wallet.network })
                    }
                  >
                    {connecting ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <PlugZap aria-hidden />
                    )}
                    {connecting
                      ? 'Aguardando aprovação…'
                      : `Conectar ${WALLET_PROVIDER_LABEL[wallet.provider]}`}
                  </Button>
                )}
                <p className="text-caption text-text-secondary" aria-live="polite">
                  {connecting
                    ? 'Confirme a conexão na sua carteira.'
                    : connect.isError && connect.variables?.walletId === wallet.id
                      ? ''
                      : connected
                        ? 'Pronta para assinar a compra.'
                        : 'Conecte para assinar a compra.'}
                </p>
                {connect.isError && connect.variables?.walletId === wallet.id && (
                  <p role="alert" className="w-full text-caption text-destructive">
                    {errorMessage(connect.error)} Tente novamente.
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </fieldset>
  )
}
