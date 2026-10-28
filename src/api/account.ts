import { z } from 'zod'
import {
  profileSchema,
  walletConnectionSchema,
  walletSchema,
  walletsResponseSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
  type UpsertWalletInput,
  type WalletSlot,
} from '@/contracts/account'
import type { Network } from '@/contracts/common'
import { http } from '@/lib/http'

const parseProfile = (r: { data: unknown }) => profileSchema.parse(r.data)

export const accountApi = {
  profile: (signal?: AbortSignal) => http.get('/profile', { signal }).then(parseProfile),
  updateProfile: (input: UpdateProfileInput) => http.patch('/profile', input).then(parseProfile),
  updateAvatar: (dataUrl: string) => http.put('/profile/avatar', { dataUrl }).then(parseProfile),
  removeAvatar: () => http.delete('/profile/avatar').then(parseProfile),
  changePassword: (input: ChangePasswordInput) =>
    http.post('/profile/password', input).then(() => undefined),

  wallets: (signal?: AbortSignal) =>
    http.get('/wallets', { signal }).then((r) => walletsResponseSchema.parse(r.data)),
  saveWallet: (slot: WalletSlot, input: UpsertWalletInput) =>
    http.put(`/wallets/${slot}`, input).then((r) => walletSchema.parse(r.data)),
  connections: (signal?: AbortSignal) =>
    http
      .get('/wallets/connections', { signal })
      .then((r) => z.object({ items: z.array(walletConnectionSchema) }).parse(r.data).items),
  connect: (walletId: string, network: Network) =>
    http
      .post(`/wallets/${walletId}/connect`, { network })
      .then((r) => walletConnectionSchema.parse(r.data)),
  disconnect: (walletId: string) =>
    http.delete(`/wallets/${walletId}/connect`).then((r) => walletConnectionSchema.parse(r.data)),
}
