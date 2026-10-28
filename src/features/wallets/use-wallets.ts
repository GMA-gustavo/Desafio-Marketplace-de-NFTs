import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountApi } from '@/api/account'
import { queryKeys } from '@/api/query-keys'
import type { UpsertWalletInput, Wallet, WalletConnection, WalletSlot } from '@/contracts/account'
import type { Network } from '@/contracts/common'
import { useSession } from '@/features/auth/session'

export function useWallets() {
  const { user } = useSession()
  return useQuery({
    queryKey: queryKeys.wallets(user?.id ?? 'anon'),
    queryFn: ({ signal }) => accountApi.wallets(signal),
    enabled: Boolean(user),
  })
}

export function walletList(data: { primary: Wallet | null; secondary: Wallet | null } | undefined) {
  return [data?.primary, data?.secondary].filter((w): w is Wallet => Boolean(w))
}

export function useWalletConnections() {
  const { user } = useSession()
  return useQuery({
    queryKey: queryKeys.walletConnections(user?.id ?? 'anon'),
    queryFn: ({ signal }) => accountApi.connections(signal),
    enabled: Boolean(user),
  })
}

/** Conectar/desconectar simulam o pop-up da extensão (o cenário decide aprovar ou recusar). */
export function useWalletConnection() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const key = queryKeys.walletConnections(user?.id ?? 'anon')
  const store = (connection: WalletConnection) =>
    queryClient.setQueryData<WalletConnection[]>(key, (old) => [
      ...(old ?? []).filter((c) => c.walletId !== connection.walletId),
      connection,
    ])

  const connect = useMutation({
    mutationFn: ({ walletId, network }: { walletId: string; network: Network }) =>
      accountApi.connect(walletId, network),
    onSuccess: store,
  })
  const disconnect = useMutation({
    mutationFn: (walletId: string) => accountApi.disconnect(walletId),
    onSuccess: store,
  })
  return { connect, disconnect }
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  return useMutation({
    mutationFn: ({ slot, input }: { slot: WalletSlot; input: UpsertWalletInput }) =>
      accountApi.saveWallet(slot, input),
    onSuccess: (wallet) => {
      queryClient.setQueryData(
        queryKeys.wallets(user!.id),
        (old: { primary: Wallet | null; secondary: Wallet | null } | undefined) => ({
          primary: old?.primary ?? null,
          secondary: old?.secondary ?? null,
          [wallet.slot]: wallet,
        }),
      )
    },
  })
}
