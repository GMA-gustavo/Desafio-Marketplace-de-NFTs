import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/require-auth'

export const Route = createFileRoute('/perfil')({
  beforeLoad: requireAuth,
  component: Outlet,
})
