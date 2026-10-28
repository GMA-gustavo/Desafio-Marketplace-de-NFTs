import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import { favoritesApi, type Favorites } from '@/api/catalog'
import { queryKeys } from '@/api/query-keys'
import { useSession } from '@/features/auth/session'
import { errorMessage } from '@/lib/api-error'

export function useFavorites() {
  const { user } = useSession()
  return useQuery({
    queryKey: queryKeys.favorites(user?.id ?? 'anon'),
    queryFn: ({ signal }) => favoritesApi.list(signal),
    enabled: Boolean(user),
  })
}

export function useIsFavorite(nftId: string) {
  const favorites = useFavorites()
  return favorites.data?.ids.includes(nftId) ?? false
}

/**
 * Favoritar com atualização otimista: a UI muda na hora; se a API falhar,
 * o estado anterior é restaurado e o usuário é avisado.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })

  const mutation = useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) =>
      favorite ? favoritesApi.add(nftId) : favoritesApi.remove(nftId),
    onMutate: async ({ nftId, favorite }) => {
      const key = queryKeys.favorites(user!.id)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      queryClient.setQueryData<Favorites>(key, (old) => {
        const base = old ?? { ids: [], items: [] }
        return {
          ids: favorite
            ? [nftId, ...base.ids.filter((id) => id !== nftId)]
            : base.ids.filter((id) => id !== nftId),
          items: favorite ? base.items : base.items.filter((n) => n.id !== nftId),
        }
      })
      return { previous, key }
    },
    onError: (error, { name, favorite }, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
      toast.error(
        `Não foi possível ${favorite ? 'favoritar' : 'remover dos favoritos'} ${name}. ${errorMessage(error)}`,
      )
    },
    onSuccess: (_data, { name, favorite }) => {
      toast.success(
        favorite ? `${name} adicionado aos favoritos.` : `${name} removido dos favoritos.`,
        {
          id: 'favorite-feedback',
        },
      )
    },
    onSettled: (_data, _error, _vars, context) => {
      if (context) void queryClient.invalidateQueries({ queryKey: context.key })
    },
  })

  return {
    isPending: mutation.isPending,
    toggle(nftId: string, name: string, isFavorite: boolean) {
      if (!user) {
        toast.info('Entre na sua conta para salvar favoritos.')
        void navigate({ to: '/entrar', search: { redirect: href } })
        return
      }
      mutation.mutate({ nftId, name, favorite: !isFavorite })
    },
  }
}
