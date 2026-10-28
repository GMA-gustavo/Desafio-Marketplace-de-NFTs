import type { Network } from '@/contracts/common'
import type { CatalogQuery } from '@/contracts/nft'
import type { OrderStatus } from '@/contracts/order'

/**
 * Fábrica de query keys. Dados privados ficam sob ['user', userId, ...] e o
 * carrinho sob ['cart', owner]: isolamento por usuário e limpeza em lote no logout.
 */
export const queryKeys = {
  session: ['session'] as const,
  catalog: (params: CatalogQuery) => ['catalog', params] as const,
  catalogAll: ['catalog'] as const,
  highlights: ['highlights'] as const,
  nft: (id: string) => ['nft', id] as const,
  nftAll: ['nft'] as const,

  cartOwner: (userId: string | null) => userId ?? 'guest',
  cart: (userId: string | null) => ['cart', queryKeys.cartOwner(userId)] as const,
  quote: (userId: string | null, network: Network) =>
    ['cart', queryKeys.cartOwner(userId), 'quote', network] as const,
  cartAll: ['cart'] as const,

  user: (userId: string) => ['user', userId] as const,
  userAll: ['user'] as const,
  favorites: (userId: string) => ['user', userId, 'favorites'] as const,
  profile: (userId: string) => ['user', userId, 'profile'] as const,
  wallets: (userId: string) => ['user', userId, 'wallets'] as const,
  walletConnections: (userId: string) => ['user', userId, 'wallet-connections'] as const,
  orders: (userId: string, status?: OrderStatus) => ['user', userId, 'orders', { status }] as const,
  order: (userId: string, orderId: string) => ['user', userId, 'order', orderId] as const,
}
