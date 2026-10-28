import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthScreen } from '@/features/auth/auth-screen'
import { safeRedirect, sessionQueryOptions } from '@/features/auth/session'

export const Route = createFileRoute('/entrar')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  staticData: { hideMobileChrome: true },
  beforeLoad: async ({ context, search }) => {
    const user = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (user) throw redirect({ to: safeRedirect(search.redirect), replace: true })
  },
  head: () => ({ meta: [{ title: 'Entrar — Kurio' }] }),
  component: LoginRoute,
})

function LoginRoute() {
  const search = Route.useSearch()
  return <AuthScreen mode="login" redirect={search.redirect} />
}
