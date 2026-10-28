import { z } from 'zod'
import { ethAmount } from './common'
import { editionIdSchema } from './nft'
import { orderSchema } from './order'

export const SOCKET_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const

/**
 * Envelope comum: `eventId` identifica a entrega (deduplicação),
 * `resource` + `version` ordenam os estados (eventos antigos são descartados).
 */
function envelope<T extends z.ZodType>(type: string, resourceType: string, data: T) {
  return z.object({
    eventId: z.string(),
    type: z.literal(type),
    resource: z.object({ type: z.literal(resourceType), id: z.string() }),
    version: z.number().int(),
    occurredAt: z.string(),
    data,
  })
}

export const nftUpdatedEventSchema = envelope(
  SOCKET_EVENTS.nftUpdated,
  'nft',
  z.object({
    price: ethAmount,
    compareAtPrice: ethAmount.nullable(),
    available: z.number().int(),
    editions: z.array(
      z.object({
        id: editionIdSchema,
        price: ethAmount,
        available: z.number().int(),
        maxPerOrder: z.number().int(),
      }),
    ),
  }),
)
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = envelope(SOCKET_EVENTS.orderUpdated, 'order', orderSchema)
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent
