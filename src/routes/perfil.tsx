import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/features/auth/require-auth'
import { ProfileShell } from '@/features/profile/profile-shell'

export const Route = createFileRoute('/perfil')({
  beforeLoad: requireAuth,
  component: () => (
    <ProfileShell>
      <Outlet />
    </ProfileShell>
  ),
})
