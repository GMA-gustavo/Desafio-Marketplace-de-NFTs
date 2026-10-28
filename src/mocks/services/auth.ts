import type { User } from '@/contracts/auth'
import { randomId } from '../crypto'
import { db } from '../db/store'
import type { DbSession, DbUser } from '../db/types'
import { MockApiError } from '../http'
import { scenario } from '../scenarios'

export function toUserDto(user: DbUser): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}

export function createSession(userId: string): DbSession {
  const session: DbSession = {
    token: randomId('tok'),
    userId,
    expiresAt: new Date(Date.now() + scenario.config.sessionTtlMinutes * 60_000).toISOString(),
    revoked: false,
  }
  db.write((s) => {
    s.sessions.push(session)
  })
  return session
}

function tokenFrom(request: Request) {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

export function sessionByToken(token: string | null) {
  if (!token) return null
  return db.state.sessions.find((s) => s.token === token) ?? null
}

export function isSessionActive(session: DbSession) {
  return !session.revoked && new Date(session.expiresAt).getTime() > Date.now()
}

/** Exige sessão válida; distingue ausência de sessão de sessão expirada. */
export function requireUser(request: Request) {
  const session = sessionByToken(tokenFrom(request))
  if (!session) throw new MockApiError('unauthorized', 'Faça login para continuar.')
  if (!isSessionActive(session)) {
    throw new MockApiError('session_expired', 'Sua sessão expirou. Entre novamente para continuar.')
  }
  const user = db.state.users.find((u) => u.id === session.userId)
  if (!user) throw new MockApiError('unauthorized', 'Faça login para continuar.')
  return { user, session }
}

/** Usuário da sessão quando houver; ignora sessão ausente, mas sinaliza expirada. */
export function optionalUser(request: Request) {
  const token = tokenFrom(request)
  if (!token) return null
  return requireUser(request)
}

/** Ação do painel de cenários: expira todas as sessões ativas imediatamente. */
export function expireAllSessions() {
  db.write((s) => {
    for (const session of s.sessions) {
      if (isSessionActive(session)) session.expiresAt = new Date(Date.now() - 1000).toISOString()
    }
  })
}
