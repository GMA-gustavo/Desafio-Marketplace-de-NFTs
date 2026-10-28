import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { cartApi } from '@/api/cart'
import { queryKeys } from '@/api/query-keys'
import type { AuthResponse, User } from '@/contracts/auth'
import { toApiError } from '@/lib/api-error'
import { storage } from '@/lib/storage'
import { realtimeClient } from '@/realtime/realtime-client'

/**
 * A sessão é estado remoto: GET /auth/session valida o token salvo (recuperação após refresh).
 * `null` = visitante. Erros de rede propagam (não deslogam o usuário por uma falha transitória).
 */
export const sessionQueryOptions = queryOptions({
  queryKey: queryKeys.session,
  queryFn: async ({ signal }): Promise<User | null> => {
    if (!storage.getSession()) return null
    try {
      return (await authApi.session(signal)).user
    } catch (error) {
      if (toApiError(error).isAuthError) {
        storage.setSession(null)
        return null
      }
      throw error
    }
  },
  staleTime: Infinity,
  retry: 1,
})

export function useSession() {
  const query = useQuery(sessionQueryOptions)
  return { user: query.data ?? null, isPending: query.isPending }
}

/** Remove tudo que pertence ao usuário (cache, assinatura de eventos, pedido pendente). */
export function clearPrivateState(queryClient: QueryClient) {
  storage.setSession(null)
  storage.setPendingOrder(null)
  realtimeClient.disconnect()
  queryClient.removeQueries({ queryKey: queryKeys.userAll })
  queryClient.removeQueries({ queryKey: queryKeys.cartAll })
  queryClient.setQueryData(queryKeys.session, null)
}

/**
 * Conclui login/cadastro: guarda a sessão, descarta dados de um usuário anterior
 * e traz os itens do carrinho de visitante para o carrinho da conta.
 */
export async function completeAuthentication(queryClient: QueryClient, response: AuthResponse) {
  const guestCartId = storage.getGuestCartId()
  const previous = storage.getSession()
  if (previous && previous.userId !== response.user.id) clearPrivateState(queryClient)

  storage.setSession({ ...response.session, userId: response.user.id })
  queryClient.removeQueries({ queryKey: queryKeys.cart(null) })
  queryClient.setQueryData(queryKeys.session, response.user)

  if (guestCartId) {
    try {
      const cart = await cartApi.merge(guestCartId)
      queryClient.setQueryData(queryKeys.cart(response.user.id), cart)
    } catch {
      // O carrinho da conta continua válido; os itens do visitante seguem no servidor.
    }
    storage.setGuestCartId(null)
  }
}

export async function logout(queryClient: QueryClient) {
  await authApi.logout().catch(() => undefined)
  clearPrivateState(queryClient)
}

/** Aceita só caminhos internos para evitar open redirect. */
export function safeRedirect(target: string | undefined, fallback = '/') {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return fallback
  if (target.startsWith('/entrar') || target.startsWith('/cadastro')) return fallback
  return target
}
