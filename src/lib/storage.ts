import type { Session } from '@/contracts/auth'
import type { CreateOrderInput } from '@/contracts/order'

/** Chaves do app no localStorage — todas com prefixo "kurio." (o reset dos mocks as limpa). */
export const STORAGE_KEYS = {
  session: 'kurio.session',
  guestCartId: 'kurio.guestCartId',
  pendingOrder: 'kurio.pendingOrder',
  checkoutDraft: 'kurio.checkoutDraft',
  checkoutAttempt: 'kurio.checkoutAttempt',
} as const

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* modo privado / quota: segue só em memória */
  }
}

export interface StoredSession extends Session {
  userId: string
}

export interface PendingOrderRef {
  orderId: string
  idempotencyKey: string
  userId: string
}

/** Rascunho do checkout: sobrevive a refresh e à expiração da sessão (só para o mesmo usuário). */
export interface CheckoutDraft {
  userId: string
  values: Record<string, unknown>
  walletId: string | null
}

/**
 * Tentativa de compra gravada ANTES do envio: se a resposta se perder (timeout, refresh,
 * queda de rede), o reenvio usa a mesma chave e o mesmo corpo e recupera o mesmo pedido.
 */
export interface CheckoutAttempt {
  userId: string
  idempotencyKey: string
  body: CreateOrderInput
  startedAt: string
}

export const storage = {
  getSession: () => read<StoredSession>(STORAGE_KEYS.session),
  setSession: (session: StoredSession | null) => write(STORAGE_KEYS.session, session),
  getGuestCartId: () => read<string>(STORAGE_KEYS.guestCartId),
  setGuestCartId: (id: string | null) => write(STORAGE_KEYS.guestCartId, id),
  getPendingOrder: () => read<PendingOrderRef>(STORAGE_KEYS.pendingOrder),
  setPendingOrder: (ref: PendingOrderRef | null) => write(STORAGE_KEYS.pendingOrder, ref),
  getCheckoutDraft: () => read<CheckoutDraft>(STORAGE_KEYS.checkoutDraft),
  setCheckoutDraft: (draft: CheckoutDraft | null) => write(STORAGE_KEYS.checkoutDraft, draft),
  getCheckoutAttempt: () => read<CheckoutAttempt>(STORAGE_KEYS.checkoutAttempt),
  setCheckoutAttempt: (attempt: CheckoutAttempt | null) =>
    write(STORAGE_KEYS.checkoutAttempt, attempt),
}
