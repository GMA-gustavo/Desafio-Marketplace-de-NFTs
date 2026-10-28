import axios from 'axios'
import { env } from './env'
import { networkReady } from './network-ready'
import { toApiError } from './api-error'
import { storage } from './storage'

export const CART_HEADER = 'X-Cart-Id'
export const HTTP_TIMEOUT_MS = 10_000

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: HTTP_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
})

type SessionExpiredListener = () => void
const sessionExpiredListeners = new Set<SessionExpiredListener>()

/** A camada de sessão assina para reagir a 401 "session_expired" vindo de qualquer chamada. */
export function onSessionExpired(listener: SessionExpiredListener) {
  sessionExpiredListeners.add(listener)
  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

http.interceptors.request.use(async (config) => {
  await networkReady
  const session = storage.getSession()
  if (session) config.headers.Authorization = `Bearer ${session.token}`
  const guestCartId = storage.getGuestCartId()
  if (guestCartId) config.headers[CART_HEADER] = guestCartId
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    if (apiError.code === 'session_expired') {
      for (const listener of sessionExpiredListeners) listener()
    }
    return Promise.reject(apiError)
  },
)
