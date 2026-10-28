import { useQuery } from '@tanstack/react-query'
import { accountApi } from '@/api/account'
import { queryKeys } from '@/api/query-keys'
import { useSession } from '@/features/auth/session'

export function useProfile() {
  const { user } = useSession()
  return useQuery({
    queryKey: queryKeys.profile(user?.id ?? 'anon'),
    queryFn: ({ signal }) => accountApi.profile(signal),
    enabled: Boolean(user),
  })
}
