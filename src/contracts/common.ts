import { z } from 'zod'

/** Valores em ETH trafegam como string decimal (ex.: "1.19") para não perder precisão. */
export const ethAmount = z.string().regex(/^\d+(\.\d+)?$/, 'Valor decimal inválido')
export type EthAmount = z.infer<typeof ethAmount>

export const isoDate = z.string()

export const networkSchema = z.enum(['ethereum', 'polygon', 'solana'])
export type Network = z.infer<typeof networkSchema>

export const NETWORK_LABEL: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const walletProviderSchema = z.enum(['metamask', 'walletconnect', 'coinbase'])
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const WALLET_PROVIDER_LABEL: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

/**
 * Modelo único de erro da API. `code` é estável e orienta a UI;
 * `fieldErrors` mapeia campo → mensagem para formulários.
 */
export const apiErrorCodeSchema = z.enum([
  'validation_error',
  'unauthorized',
  'session_expired',
  'forbidden',
  'not_found',
  'conflict',
  'email_taken',
  'username_taken',
  'invalid_credentials',
  'insufficient_stock',
  'edition_unavailable',
  'quote_changed',
  'quote_expired',
  'idempotency_conflict',
  'coupon_invalid',
  'coupon_expired',
  'wallet_rejected',
  'wallet_required',
  'cart_empty',
  'transient',
])
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
    details: z.unknown().optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>

export function paginated<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  })
}
