import { z } from 'zod'
import { isoDate } from './common'

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: isoDate,
})
export type Session = z.infer<typeof sessionSchema>

export const authResponseSchema = z.object({ user: userSchema, session: sessionSchema })
export type AuthResponse = z.infer<typeof authResponseSchema>

const password = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra.')
  .regex(/\d/, 'Inclua pelo menos um número.')

export const loginInputSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})
export type LoginInput = z.infer<typeof loginInputSchema>

export const registerInputSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Use pelo menos 3 caracteres.')
      .max(24, 'Use no máximo 24 caracteres.')
      .regex(/^[a-z0-9._]+$/i, 'Use apenas letras, números, ponto ou sublinhado.'),
    email: z.email('Informe um e-mail válido.'),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
export type RegisterInput = z.infer<typeof registerInputSchema>

export { password as passwordSchema }
