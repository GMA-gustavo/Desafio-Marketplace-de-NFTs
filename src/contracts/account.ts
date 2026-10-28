import { z } from 'zod'
import { networkSchema, walletProviderSchema } from './common'
import { passwordSchema } from './auth'

export const profileSchema = z.object({
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  ensName: z.string(),
  walletNickname: z.string(),
  avatarUrl: z.string().nullable(),
})
export type Profile = z.infer<typeof profileSchema>

export const updateProfileInputSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.').max(40),
  username: z
    .string()
    .trim()
    .min(3, 'Use pelo menos 3 caracteres.')
    .max(24, 'Use no máximo 24 caracteres.')
    .regex(/^[a-z0-9._]+$/i, 'Use apenas letras, números, ponto ou sublinhado.'),
  email: z.email('Informe um e-mail válido.'),
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,32}$/i, 'Use de 3 a 32 letras, números ou hífen.'),
  walletNickname: z.string().trim().min(2, 'Informe o apelido da carteira.').max(32),
})
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>

export const MAX_AVATAR_BYTES = 512 * 1024

export const updateAvatarInputSchema = z.object({
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpe?g|webp);base64,/, 'Use uma imagem PNG, JPG ou WebP.'),
})

export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual.',
  })
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>

export const walletSlotSchema = z.enum(['primary', 'secondary'])
export type WalletSlot = z.infer<typeof walletSlotSchema>

export const walletSchema = z.object({
  id: z.string(),
  slot: walletSlotSchema,
  displayName: z.string(),
  nickname: z.string(),
  network: networkSchema,
  profileName: z.string(),
  address: z.string(),
  secondaryAddress: z.string().nullable(),
  provider: walletProviderSchema,
  referralCode: z.string(),
  email: z.string(),
  ensName: z.string(),
  updatedAt: z.string(),
})
export type Wallet = z.infer<typeof walletSchema>

export const walletsResponseSchema = z.object({
  primary: walletSchema.nullable(),
  secondary: walletSchema.nullable(),
})
export type WalletsResponse = z.infer<typeof walletsResponseSchema>

export const walletAddress = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.')

export const upsertWalletInputSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.'),
  nickname: z.string().trim().min(2, 'Informe o apelido da carteira.'),
  network: networkSchema,
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.'),
  address: walletAddress,
  secondaryAddress: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^0x[a-fA-F0-9]{40}$/.test(v) || /^[a-z0-9-]+\.eth$/i.test(v),
      'Use um endereço 0x ou um nome .eth.',
    )
    .optional(),
  provider: walletProviderSchema,
  referralCode: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{4,16}$/i, 'Use de 4 a 16 letras, números ou hífen.'),
  email: z.email('Informe um e-mail válido.'),
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,32}$/i, 'Use de 3 a 32 letras, números ou hífen.'),
})
export type UpsertWalletInput = z.infer<typeof upsertWalletInputSchema>

export const walletConnectionSchema = z.object({
  walletId: z.string(),
  status: z.enum(['connected', 'disconnected']),
  network: networkSchema,
})
export type WalletConnection = z.infer<typeof walletConnectionSchema>
