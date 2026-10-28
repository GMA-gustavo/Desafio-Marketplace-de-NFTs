import { authResponseSchema, type LoginInput, type RegisterInput } from '@/contracts/auth'
import { http } from '@/lib/http'

export const authApi = {
  login: (input: LoginInput) =>
    http.post('/auth/login', input).then((r) => authResponseSchema.parse(r.data)),
  register: (input: RegisterInput) =>
    http.post('/auth/register', input).then((r) => authResponseSchema.parse(r.data)),
  session: (signal?: AbortSignal) =>
    http.get('/auth/session', { signal }).then((r) => authResponseSchema.parse(r.data)),
  logout: () => http.post('/auth/logout').then(() => undefined),
}
