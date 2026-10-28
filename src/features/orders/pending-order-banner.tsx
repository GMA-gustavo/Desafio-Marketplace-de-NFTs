import { Link, useRouterState } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Container } from '@/components/layout/container'
import { useSession } from '@/features/auth/session'
import { storage } from '@/lib/storage'

/** Lembra o usuário de um pedido ainda pendente (ex.: fechou a aba durante a confirmação). */
export function PendingOrderBanner() {
  const { user } = useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const pending = storage.getPendingOrder()
  if (!user || !pending || pending.userId !== user.id || pathname.startsWith('/pedidos/'))
    return null

  return (
    <div role="status" className="bg-surface-dark">
      <Container className="flex items-center justify-between gap-3 py-2 text-body">
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
          Você tem uma compra aguardando confirmação.
        </span>
        <Link
          to="/pedidos/$orderId"
          params={{ orderId: pending.orderId }}
          className="font-bold text-primary hover:underline"
        >
          Ver pedido
        </Link>
      </Container>
    </div>
  )
}
