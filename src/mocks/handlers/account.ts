import { z } from 'zod'
import {
  changePasswordInputSchema,
  MAX_AVATAR_BYTES,
  updateAvatarInputSchema,
  updateProfileInputSchema,
  upsertWalletInputSchema,
  walletSlotSchema,
  type Profile,
  type Wallet,
} from '@/contracts/account'
import { networkSchema } from '@/contracts/common'
import { hashPassword, randomId } from '../crypto'
import { db } from '../db/store'
import type { DbUser } from '../db/types'
import { json, MockApiError, noContent, parseBody, route } from '../http'
import { scenario } from '../scenarios'
import { requireUser } from '../services/auth'

function toProfile(user: DbUser): Profile {
  return {
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    ensName: user.ensName,
    walletNickname: user.walletNickname,
    avatarUrl: user.avatarUrl,
  }
}

function mutateUser(id: string, fn: (u: DbUser) => void) {
  return db.write((s) => {
    const user = s.users.find((u) => u.id === id)!
    fn(user)
    return user
  })
}

function findWallet(userId: string, walletId: string) {
  const set = db.state.wallets[userId]
  const wallet = [set?.primary, set?.secondary].find((w) => w?.id === walletId)
  if (!wallet) throw new MockApiError('not_found', 'Carteira não encontrada.')
  return wallet
}

export const accountHandlers = [
  route('GET', '/profile', ({ request }) => json(toProfile(requireUser(request).user))),

  route('PATCH', '/profile', async ({ request }) => {
    const { user } = requireUser(request)
    const input = await parseBody(request, updateProfileInputSchema)
    const email = input.email.toLowerCase()
    const username = input.username.toLowerCase()
    if (db.state.users.some((u) => u.id !== user.id && u.email === email)) {
      throw new MockApiError('email_taken', 'Este e-mail já está em uso.', {
        fieldErrors: { email: 'Este e-mail já está em uso por outra conta.' },
      })
    }
    if (db.state.users.some((u) => u.id !== user.id && u.username === username)) {
      throw new MockApiError('username_taken', 'Este nome de usuário já está em uso.', {
        fieldErrors: { username: 'Este nome de usuário já está em uso.' },
      })
    }
    const updated = mutateUser(user.id, (u) => {
      Object.assign(u, { ...input, email, username })
    })
    return json(toProfile(updated))
  }),

  route('PUT', '/profile/avatar', async ({ request }) => {
    const { user } = requireUser(request)
    const { dataUrl } = await parseBody(request, updateAvatarInputSchema)
    const bytes = Math.ceil(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4)
    if (bytes > MAX_AVATAR_BYTES) {
      throw new MockApiError('validation_error', 'A imagem deve ter no máximo 512 KB.', {
        fieldErrors: { avatar: 'A imagem deve ter no máximo 512 KB.' },
      })
    }
    return json(toProfile(mutateUser(user.id, (u) => (u.avatarUrl = dataUrl))))
  }),

  route('DELETE', '/profile/avatar', ({ request }) => {
    const { user } = requireUser(request)
    return json(toProfile(mutateUser(user.id, (u) => (u.avatarUrl = null))))
  }),

  route('POST', '/profile/password', async ({ request }) => {
    const { user, session } = requireUser(request)
    const input = await parseBody(request, changePasswordInputSchema)
    if ((await hashPassword(input.currentPassword, user.salt)) !== user.passwordHash) {
      throw new MockApiError('validation_error', 'A senha atual está incorreta.', {
        fieldErrors: { currentPassword: 'A senha atual está incorreta.' },
      })
    }
    const salt = randomId('salt')
    const passwordHash = await hashPassword(input.newPassword, salt)
    db.write((s) => {
      Object.assign(
        s.users.find((u) => u.id === user.id)!,
        { salt, passwordHash },
      )
      // Encerra as outras sessões do usuário, mantendo a atual.
      for (const other of s.sessions) {
        if (other.userId === user.id && other.token !== session.token) other.revoked = true
      }
    })
    return noContent()
  }),

  route('GET', '/wallets', ({ request }) => {
    const { user } = requireUser(request)
    return json(db.state.wallets[user.id] ?? { primary: null, secondary: null })
  }),

  route<{ slot: string }>('PUT', '/wallets/:slot', async ({ request, params }) => {
    const { user } = requireUser(request)
    const slot = walletSlotSchema.safeParse(params.slot)
    if (!slot.success) throw new MockApiError('not_found', 'Tipo de carteira inválido.')
    const input = await parseBody(request, upsertWalletInputSchema)
    const set = db.state.wallets[user.id] ?? { primary: null, secondary: null }
    const wallet: Wallet = {
      id: set[slot.data]?.id ?? randomId(`wal_${slot.data}`),
      slot: slot.data,
      ...input,
      secondaryAddress: input.secondaryAddress || null,
      updatedAt: new Date().toISOString(),
    }
    db.write((s) => {
      ;(s.wallets[user.id] ??= { primary: null, secondary: null })[slot.data] = wallet
    })
    return json(wallet)
  }),

  route('GET', '/wallets/connections', ({ request }) => {
    const { user } = requireUser(request)
    const set = db.state.wallets[user.id]
    const ids = [set?.primary?.id, set?.secondary?.id].filter(Boolean)
    return json({ items: ids.flatMap((id) => db.state.walletConnections[id!] ?? []) })
  }),

  /** Simula o pop-up da extensão: aprova ou recusa conforme o cenário. */
  route<{ id: string }>('POST', '/wallets/:id/connect', async ({ request, params }) => {
    const { user } = requireUser(request)
    const wallet = findWallet(user.id, params.id)
    const { network } = await parseBody(request, z.object({ network: networkSchema }))
    if (scenario.config.walletConnection === 'reject') {
      throw new MockApiError('wallet_rejected', 'A conexão foi recusada na carteira.')
    }
    const connection = { walletId: wallet.id, status: 'connected' as const, network }
    db.write((s) => {
      s.walletConnections[wallet.id] = connection
    })
    return json(connection)
  }),

  route<{ id: string }>('DELETE', '/wallets/:id/connect', ({ request, params }) => {
    const { user } = requireUser(request)
    const wallet = findWallet(user.id, params.id)
    const connection = {
      walletId: wallet.id,
      status: 'disconnected' as const,
      network: db.state.walletConnections[wallet.id]?.network ?? wallet.network,
    }
    db.write((s) => {
      s.walletConnections[wallet.id] = connection
    })
    return json(connection)
  }),
]
