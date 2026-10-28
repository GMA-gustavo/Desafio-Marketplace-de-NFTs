import { loginInputSchema, registerInputSchema } from '@/contracts/auth'
import { hashPassword, randomId } from '../crypto'
import { db } from '../db/store'
import type { DbUser } from '../db/types'
import { json, MockApiError, noContent, parseBody, route } from '../http'
import { createSession, requireUser, sessionByToken, toUserDto } from '../services/auth'

export const authHandlers = [
  route('POST', '/auth/register', async ({ request }) => {
    const input = await parseBody(request, registerInputSchema)
    const email = input.email.toLowerCase()
    const username = input.username.toLowerCase()
    if (db.state.users.some((u) => u.email === email)) {
      throw new MockApiError('email_taken', 'Já existe uma conta com este e-mail.', {
        fieldErrors: { email: 'Este e-mail já está cadastrado.' },
      })
    }
    if (db.state.users.some((u) => u.username === username)) {
      throw new MockApiError('username_taken', 'Este nome de usuário já está em uso.', {
        fieldErrors: { username: 'Este nome de usuário já está em uso.' },
      })
    }
    const id = randomId('usr')
    const salt = randomId('salt')
    const user: DbUser = {
      id,
      username,
      email,
      displayName: input.username,
      ensName: username.replace(/[^a-z0-9-]/g, '-'),
      walletNickname: 'Principal',
      avatarUrl: null,
      salt,
      passwordHash: await hashPassword(input.password, salt),
      createdAt: new Date().toISOString(),
    }
    db.write((s) => {
      s.users.push(user)
      s.favorites[id] = []
      s.wallets[id] = { primary: null, secondary: null }
    })
    const session = createSession(id)
    return json(
      { user: toUserDto(user), session: { token: session.token, expiresAt: session.expiresAt } },
      { status: 201 },
    )
  }),

  route('POST', '/auth/login', async ({ request }) => {
    const input = await parseBody(request, loginInputSchema)
    const user = db.state.users.find((u) => u.email === input.email.toLowerCase())
    const valid = user && (await hashPassword(input.password, user.salt)) === user.passwordHash
    if (!user || !valid) {
      throw new MockApiError('invalid_credentials', 'E-mail ou senha incorretos.')
    }
    const session = createSession(user.id)
    return json({
      user: toUserDto(user),
      session: { token: session.token, expiresAt: session.expiresAt },
    })
  }),

  route('GET', '/auth/session', ({ request }) => {
    const { user, session } = requireUser(request)
    return json({
      user: toUserDto(user),
      session: { token: session.token, expiresAt: session.expiresAt },
    })
  }),

  route('POST', '/auth/logout', ({ request }) => {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? null
    const session = sessionByToken(token)
    if (session) {
      db.write((s) => {
        s.sessions.find((x) => x.token === session.token)!.revoked = true
      })
    }
    return noContent()
  }),
]
