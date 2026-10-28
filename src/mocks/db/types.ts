import type { Network } from '@/contracts/common'
import type { Edition, EditionId, NftDetail } from '@/contracts/nft'
import type { Order } from '@/contracts/order'
import type { Wallet } from '@/contracts/account'

export type DbNft = Omit<NftDetail, 'price' | 'available' | 'editions'> & {
  editions: Edition[]
  isNew: boolean
  trending: number
  featured: boolean
}

export interface DbUser {
  id: string
  username: string
  email: string
  displayName: string
  ensName: string
  walletNickname: string
  avatarUrl: string | null
  /** SHA-256(salt + senha) em hex — senhas nunca ficam em claro. */
  passwordHash: string
  salt: string
  createdAt: string
}

export interface DbSession {
  token: string
  userId: string
  expiresAt: string
  revoked: boolean
}

export interface DbCartItem {
  id: string
  nftId: string
  editionId: EditionId
  quantity: number
  /** Último preço que o usuário viu (para sinalizar alteração). */
  priceSeen: string
}

export interface DbCart {
  id: string
  /** null para carrinho de visitante. */
  userId: string | null
  items: DbCartItem[]
  couponCode: string | null
  updatedAt: string
  version: number
}

export interface DbCoupon {
  code: string
  percentOff: number
  expiresAt: string
  description: string
}

export interface DbQuote {
  id: string
  cartId: string
  network: Network
  /** Assinatura dos valores cotados; muda se preço, estoque, cupom ou taxa mudarem. */
  fingerprint: string
  total: string
  createdAt: string
  expiresAt: string
}

export interface DbOrder extends Order {
  cartId: string
  quoteId: string
  /** Momento (epoch ms) em que a simulação liquida o pagamento. */
  settleAt: number
  outcome: 'confirmed' | 'rejected'
}

export interface DbIdempotencyRecord {
  userId: string
  bodyHash: string
  orderId: string
}

export interface DbWalletConnection {
  walletId: string
  status: 'connected' | 'disconnected'
  network: Network
}

export interface DbState {
  schemaVersion: number
  nfts: DbNft[]
  users: DbUser[]
  sessions: DbSession[]
  carts: DbCart[]
  favorites: Record<string, string[]>
  wallets: Record<string, { primary: Wallet | null; secondary: Wallet | null }>
  walletConnections: Record<string, DbWalletConnection>
  coupons: DbCoupon[]
  quotes: DbQuote[]
  orders: DbOrder[]
  idempotency: Record<string, DbIdempotencyRecord>
}
