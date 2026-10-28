import { createFileRoute } from '@tanstack/react-router'
import { WalletsPage } from '@/features/wallets/wallets-page'

export const Route = createFileRoute('/perfil/carteiras')({
  head: () => ({ meta: [{ title: 'Carteiras — Kurio' }] }),
  component: WalletsPage,
})
