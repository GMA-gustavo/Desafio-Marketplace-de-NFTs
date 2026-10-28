import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cartApi } from '@/api/cart'
import { queryKeys } from '@/api/query-keys'
import type { AddCartItemInput, Cart } from '@/contracts/cart'
import type { Network } from '@/contracts/common'
import { useSession } from '@/features/auth/session'
import { errorMessage, toApiError } from '@/lib/api-error'

/**
 * Mutations do carrinho: a resposta da API substitui o carrinho no cache
 * e a cotação é invalidada (valores sempre vêm do servidor).
 */
function useCartWriter() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const userId = user?.id ?? null
  return {
    userId,
    commit(cart: Cart) {
      queryClient.setQueryData(queryKeys.cart(userId), cart)
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.cart(userId), 'quote'] })
    },
    /** Após conflito de estoque, relê carrinho e NFT para mostrar o limite real. */
    refreshStock(nftId?: string) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
      if (nftId) void queryClient.invalidateQueries({ queryKey: queryKeys.nft(nftId) })
    },
  }
}

export function useAddToCart() {
  const writer = useCartWriter()
  return useMutation({
    mutationFn: (input: AddCartItemInput & { name: string }) =>
      cartApi.addItem({ nftId: input.nftId, editionId: input.editionId, quantity: input.quantity }),
    onSuccess: (cart, input) => {
      writer.commit(cart)
      toast.success(`${input.name} adicionado ao carrinho.`, { id: 'cart-feedback' })
    },
    onError: (error, input) => {
      toast.error(errorMessage(error), { id: 'cart-feedback' })
      if (toApiError(error).status === 409) writer.refreshStock(input.nftId)
    },
  })
}

export function useUpdateCartItem() {
  const writer = useCartWriter()
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number; name: string }) =>
      cartApi.updateItem(itemId, quantity),
    onSuccess: (cart) => writer.commit(cart),
    onError: (error) => {
      toast.error(errorMessage(error), { id: 'cart-feedback' })
      writer.refreshStock()
    },
  })
}

export function useRemoveCartItem() {
  const writer = useCartWriter()
  return useMutation({
    mutationFn: ({ itemId }: { itemId: string; name: string }) => cartApi.removeItem(itemId),
    onSuccess: (cart, { name }) => {
      writer.commit(cart)
      toast.success(`${name} removido do carrinho.`, { id: 'cart-feedback' })
    },
    onError: (error) => toast.error(errorMessage(error), { id: 'cart-feedback' }),
  })
}

export function useCoupon() {
  const writer = useCartWriter()
  const apply = useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code),
    onSuccess: (cart) => {
      writer.commit(cart)
      toast.success(`Cupom ${cart.couponCode} aplicado.`, { id: 'coupon-feedback' })
    },
  })
  const remove = useMutation({
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (cart) => {
      writer.commit(cart)
      toast.success('Cupom removido.', { id: 'coupon-feedback' })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
  return { apply, remove }
}

export function useAcknowledgePrices() {
  const writer = useCartWriter()
  return useMutation({
    mutationFn: () => cartApi.acknowledge(),
    onSuccess: (cart) => writer.commit(cart),
    onError: (error) => toast.error(errorMessage(error)),
  })
}

/** Cotação vigente do carrinho (subtotal, desconto, taxa e total calculados pela API). */
export function useQuote(network: Network = 'ethereum', enabled = true) {
  const { user, isPending } = useSession()
  return useQuery({
    queryKey: queryKeys.quote(user?.id ?? null, network),
    queryFn: ({ signal }) => cartApi.quote(network, signal),
    enabled: enabled && !isPending,
    staleTime: 0,
  })
}
