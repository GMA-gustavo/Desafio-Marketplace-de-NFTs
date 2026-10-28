import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { queryKeys } from '@/api/query-keys'
import { onSessionExpired } from '@/lib/http'
import { clearPrivateState } from './session'

/**
 * Reage à expiração da sessão em qualquer chamada: limpa os dados privados e leva
 * ao login com `redirect` para a tela atual (carrinho e rascunho do checkout ficam preservados).
 */
export function SessionWatcher() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(
    () =>
      onSessionExpired(() => {
        const hadUser = Boolean(queryClient.getQueryData(queryKeys.session))
        clearPrivateState(queryClient, { keepCheckoutContext: true })
        if (!hadUser) return
        toast.warning('Sua sessão expirou. Entre novamente para continuar de onde parou.', {
          id: 'session-expired',
        })
        const { pathname, href } = router.state.location
        if (pathname === '/entrar' || pathname === '/cadastro') return
        void router.navigate({ to: '/entrar', search: { redirect: href } })
      }),
    [queryClient, router],
  )

  return null
}
