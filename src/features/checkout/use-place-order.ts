import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ordersApi } from '@/api/orders'
import { queryKeys } from '@/api/query-keys'
import { quoteSchema, type Quote } from '@/contracts/cart'
import type { CreateOrderInput } from '@/contracts/order'
import { useSession } from '@/features/auth/session'
import { toApiError } from '@/lib/api-error'
import { storage, type CheckoutAttempt } from '@/lib/storage'

const QUOTE_CONFLICTS = new Set(['quote_changed', 'quote_expired', 'insufficient_stock'])

/** Extrai a cotação atualizada que a API devolve junto com um conflito de checkout. */
export function quoteFromConflict(error: unknown): Quote | null {
  const apiError = toApiError(error)
  if (!apiError.code || !QUOTE_CONFLICTS.has(apiError.code)) return null
  const parsed = quoteSchema.safeParse((apiError.details as { quote?: unknown } | undefined)?.quote)
  return parsed.success ? parsed.data : null
}

/** Nova tentativa = nova chave. Reenvios da MESMA tentativa reaproveitam a chave salva. */
export function createAttempt(userId: string, body: CreateOrderInput): CheckoutAttempt {
  return {
    userId,
    idempotencyKey: crypto.randomUUID(),
    body,
    startedAt: new Date().toISOString(),
  }
}

/**
 * Envia o pedido de forma idempotente:
 * - a tentativa é persistida antes do envio (sobrevive a refresh/queda);
 * - timeout e falha de rede são reenviados com a mesma chave (o servidor devolve o mesmo pedido);
 * - cliques repetidos são bloqueados enquanto a mutation está pendente.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useSession()

  return useMutation({
    mutationKey: ['place-order'],
    // Envios do pedido rodam em fila: nunca dois POST /orders simultâneos.
    scope: { id: 'place-order' },
    mutationFn: (attempt: CheckoutAttempt) => {
      storage.setCheckoutAttempt(attempt)
      return ordersApi.create(attempt.body, attempt.idempotencyKey)
    },
    retry: (failureCount, error) => toApiError(error).isTransient && failureCount < 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    onSuccess: async (order, attempt) => {
      storage.setCheckoutAttempt(null)
      storage.setCheckoutDraft(null)
      storage.setPendingOrder({
        orderId: order.id,
        idempotencyKey: attempt.idempotencyKey,
        userId: order.userId,
      })
      queryClient.setQueryData(queryKeys.order(order.userId, order.id), order)
      await navigate({ to: '/pedidos/$orderId', params: { orderId: order.id }, replace: true })
    },
    onError: (error) => {
      // Falha definitiva (não transitória): a tentativa acabou; o próximo envio exige nova confirmação.
      if (!toApiError(error).isTransient) storage.setCheckoutAttempt(null)
      if (quoteFromConflict(error)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.cart(user?.id ?? null) })
      }
    },
  })
}
