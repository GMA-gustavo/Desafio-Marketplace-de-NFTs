import { redirect, type ParsedLocation } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { sessionQueryOptions } from './session'

/** `beforeLoad` das rotas privadas: sem sessão, vai para o login e volta depois. */
export async function requireAuth({
  context,
  location,
}: {
  context: { queryClient: QueryClient }
  location: ParsedLocation
}) {
  const user = await context.queryClient.ensureQueryData(sessionQueryOptions)
  if (!user) {
    throw redirect({ to: '/entrar', search: { redirect: location.href } })
  }
  return { user }
}
