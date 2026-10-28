import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import type { Favorites } from '@/api/catalog'
import { queryKeys } from '@/api/query-keys'
import type { Cart } from '@/contracts/cart'
import type { CatalogResponse, Highlights, NftDetail, NftSummary } from '@/contracts/nft'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/contracts/realtime'
import { useSession } from '@/features/auth/session'
import { formatEth } from '@/lib/money'
import { storage } from '@/lib/storage'
import { realtimeClient } from './realtime-client'

function patchSummary<T extends NftSummary>(nft: T, event: NftUpdatedEvent): T {
  if (nft.id !== event.resource.id || nft.version >= event.version) return nft
  return {
    ...nft,
    price: event.data.price,
    compareAtPrice: event.data.compareAtPrice,
    available: event.data.available,
    version: event.version,
  }
}

function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent) {
  const id = event.resource.id

  queryClient.setQueryData<NftDetail>(queryKeys.nft(id), (old) => {
    if (!old || old.version >= event.version) return old
    return {
      ...patchSummary(old, event),
      editions: old.editions.map((edition) => {
        const next = event.data.editions.find((e) => e.id === edition.id)
        return next ? { ...edition, ...next } : edition
      }),
    }
  })
  queryClient.setQueriesData<CatalogResponse>({ queryKey: queryKeys.catalogAll }, (old) =>
    old ? { ...old, items: old.items.map((n) => patchSummary(n, event)) } : old,
  )
  queryClient.setQueriesData<Highlights>({ queryKey: queryKeys.highlights }, (old) =>
    old
      ? {
          hero: old.hero.map((n) => patchSummary(n, event)),
          spotlight: patchSummary(old.spotlight, event),
        }
      : old,
  )
  queryClient.setQueriesData<Favorites>({ queryKey: queryKeys.userAll }, (old) =>
    old && 'ids' in old ? { ...old, items: old.items.map((n) => patchSummary(n, event)) } : old,
  )

  // Item no carrinho: recarrega carrinho e cotação (fonte da verdade é a API) e avisa o usuário.
  const carts = queryClient.getQueriesData<Cart>({ queryKey: queryKeys.cartAll })
  const line = carts
    .flatMap(([, cart]) => (cart && 'items' in cart ? cart.items : []))
    .find((item) => item.nftId === id)
  if (line) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.cartAll })
    const edition = event.data.editions.find((e) => e.id === line.editionId)
    if (edition && edition.available === 0) {
      toast.warning(`${line.name} esgotou. Revise seu carrinho.`, { id: `nft-${id}` })
    } else if (edition && edition.price !== line.unitPrice) {
      toast.info(`O preço de ${line.name} mudou para ${formatEth(edition.price)}.`, {
        id: `nft-${id}`,
      })
    } else if (edition && edition.available < line.quantity) {
      toast.warning(`Só restam ${edition.available} unidades de ${line.name}.`, { id: `nft-${id}` })
    }
  }
}

function applyOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent) {
  const order = event.data
  queryClient.setQueryData(
    queryKeys.order(order.userId, order.id),
    (old: typeof order | undefined) => (old && old.version >= event.version ? old : order),
  )
  void queryClient.invalidateQueries({ queryKey: ['user', order.userId, 'orders'] })
  if (order.status !== 'pending') {
    void queryClient.invalidateQueries({ queryKey: queryKeys.cartAll })
    const pending = storage.getPendingOrder()
    if (pending?.orderId === order.id) storage.setPendingOrder(null)
  }
}

/**
 * Liga o socket à sessão atual. Troca de usuário recria a conexão (o cliente descarta
 * listeners e versões da sessão anterior). Após reconectar, reconcilia via REST.
 */
export function RealtimeBridge() {
  const queryClient = useQueryClient()
  const { user, isPending } = useSession()

  useEffect(() => {
    if (isPending) return
    const session = storage.getSession()
    realtimeClient.connect(user && session ? { userId: user.id, token: session.token } : null)
  }, [user, isPending])

  useEffect(() => {
    const offNft = realtimeClient.on('nft.updated', (e) => applyNftUpdated(queryClient, e))
    const offOrder = realtimeClient.on('order.updated', (e) => applyOrderUpdated(queryClient, e))
    const offReconnect = realtimeClient.onReconnect(() => {
      void queryClient.invalidateQueries({ type: 'active' })
    })
    return () => {
      offNft()
      offOrder()
      offReconnect()
    }
  }, [queryClient])

  useEffect(() => () => realtimeClient.disconnect(), [])

  return null
}
