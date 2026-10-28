import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/require-auth'
import { CheckoutPage } from '@/features/checkout/checkout-page'

export const Route = createFileRoute('/pagamento')({
  beforeLoad: requireAuth,
  staticData: { hideMobileChrome: true },
  head: () => ({ meta: [{ title: 'Pagamento — Kurio' }] }),
  component: CheckoutPage,
})
