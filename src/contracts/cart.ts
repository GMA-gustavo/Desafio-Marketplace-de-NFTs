import { z } from 'zod'
import { ethAmount, isoDate, networkSchema } from './common'
import { editionIdSchema } from './nft'

export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: editionIdSchema,
  quantity: z.number().int().positive(),
  name: z.string(),
  tokenId: z.string(),
  art: z.string(),
  unitPrice: ethAmount,
  available: z.number().int().nonnegative(),
  maxPerOrder: z.number().int().nonnegative(),
  /** Preço quando o item foi adicionado/revisado; difere de unitPrice se mudou desde então. */
  previousUnitPrice: ethAmount.nullable(),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const cartSchema = z.object({
  id: z.string(),
  items: z.array(cartItemSchema),
  couponCode: z.string().nullable(),
  itemCount: z.number().int(),
  updatedAt: isoDate,
  version: z.number().int(),
})
export type Cart = z.infer<typeof cartSchema>

export const addCartItemInputSchema = z.object({
  nftId: z.string(),
  editionId: editionIdSchema,
  quantity: z.number().int().min(1),
})
export type AddCartItemInput = z.infer<typeof addCartItemInputSchema>

export const updateCartItemInputSchema = z.object({ quantity: z.number().int().min(1) })

export const applyCouponInputSchema = z.object({
  code: z.string().trim().min(1, 'Informe um código.'),
})

export const quoteLineStatusSchema = z.enum(['ok', 'price_changed', 'insufficient', 'sold_out'])
export type QuoteLineStatus = z.infer<typeof quoteLineStatusSchema>

export const quoteSchema = z.object({
  id: z.string(),
  network: networkSchema,
  lines: z.array(
    z.object({
      itemId: z.string(),
      nftId: z.string(),
      editionId: editionIdSchema,
      name: z.string(),
      tokenId: z.string(),
      art: z.string(),
      quantity: z.number().int(),
      unitPrice: ethAmount,
      lineTotal: ethAmount,
      available: z.number().int(),
      status: quoteLineStatusSchema,
    }),
  ),
  coupon: z
    .object({
      code: z.string(),
      status: z.enum(['applied', 'invalid', 'expired']),
      description: z.string(),
    })
    .nullable(),
  subtotal: ethAmount,
  discount: ethAmount,
  networkFee: ethAmount,
  total: ethAmount,
  /** Só é possível finalizar com uma cotação válida (todas as linhas "ok"). */
  valid: z.boolean(),
  createdAt: isoDate,
  expiresAt: isoDate,
})
export type Quote = z.infer<typeof quoteSchema>
