import { queryOptions, useQuery } from '@tanstack/react-query'
import { cartApi } from '@/api/cart'
import { queryKeys } from '@/api/query-keys'
import { storage } from '@/lib/storage'
import { useSession } from '@/features/auth/session'

export function cartQueryOptions(userId: string | null) {
  return queryOptions({
    queryKey: queryKeys.cart(userId),
    queryFn: async ({ signal }) => {
      const cart = await cartApi.get(signal)
      // O servidor cria/identifica o carrinho do visitante; guardamos o id para sobreviver ao refresh.
      // Só grava se ainda for visitante: uma busca que termina depois do login não pode
      // ressuscitar o carrinho de visitante já mesclado.
      if (!userId && !storage.getSession() && storage.getGuestCartId() !== cart.id) {
        storage.setGuestCartId(cart.id)
      }
      return cart
    },
    staleTime: 15_000,
  })
}

export function useCart() {
  const { user, isPending } = useSession()
  return useQuery({ ...cartQueryOptions(user?.id ?? null), enabled: !isPending })
}
