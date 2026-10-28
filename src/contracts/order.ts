import { z } from 'zod'
import { ethAmount, isoDate, networkSchema, walletProviderSchema } from './common'
import { editionIdSchema } from './nft'

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'rejected'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const buyerInfoSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.'),
  username: z.string().trim().min(3, 'Informe o nome de usuário.'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.'),
  email: z.email('Informe um e-mail válido.'),
  referralCode: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{4,16}$/i, 'Use de 4 a 16 letras, números ou hífen.'),
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,32}$/i, 'Use de 3 a 32 letras, números ou hífen.'),
  note: z.string().max(280, 'Máximo de 280 caracteres.').optional(),
})
export type BuyerInfo = z.infer<typeof buyerInfoSchema>

export const createOrderInputSchema = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  network: networkSchema,
  buyer: buyerInfoSchema,
})
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

/** Snapshot imutável: o recibo nunca relê o catálogo. */
export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: orderStatusSchema,
  network: networkSchema,
  wallet: z.object({
    id: z.string(),
    label: z.string(),
    address: z.string(),
    provider: walletProviderSchema,
  }),
  items: z.array(
    z.object({
      nftId: z.string(),
      editionId: editionIdSchema,
      name: z.string(),
      tokenId: z.string(),
      art: z.string(),
      quantity: z.number().int(),
      unitPrice: ethAmount,
      lineTotal: ethAmount,
    }),
  ),
  couponCode: z.string().nullable(),
  subtotal: ethAmount,
  discount: ethAmount,
  networkFee: ethAmount,
  total: ethAmount,
  txHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: isoDate,
  settledAt: isoDate.nullable(),
  version: z.number().int(),
})
export type Order = z.infer<typeof orderSchema>
