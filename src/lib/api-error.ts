import { isAxiosError } from 'axios'
import { apiErrorBodySchema, type ApiErrorCode } from '@/contracts/common'

export type ClientErrorKind = 'api' | 'network' | 'timeout' | 'canceled' | 'unknown'

/** Erro normalizado que a UI consome: nunca depende do formato do Axios. */
export class ApiError extends Error {
  readonly kind: ClientErrorKind
  readonly status: number | null
  readonly code: ApiErrorCode | null
  readonly fieldErrors: Record<string, string>
  readonly details: unknown

  constructor(init: {
    kind: ClientErrorKind
    message: string
    status?: number | null
    code?: ApiErrorCode | null
    fieldErrors?: Record<string, string>
    details?: unknown
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.kind = init.kind
    this.status = init.status ?? null
    this.code = init.code ?? null
    this.fieldErrors = init.fieldErrors ?? {}
    this.details = init.details
  }

  /** Falhas que valem uma nova tentativa automática ou manual. */
  get isTransient() {
    return this.kind === 'network' || this.kind === 'timeout' || (this.status ?? 0) >= 500
  }

  get isAuthError() {
    return this.status === 401
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') {
      return new ApiError({ kind: 'canceled', message: 'Requisição cancelada.' })
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({
        kind: 'timeout',
        message: 'O servidor demorou para responder. Tente novamente.',
      })
    }
    if (!error.response) {
      return new ApiError({
        kind: 'network',
        message: 'Sem conexão com o servidor. Verifique sua internet.',
      })
    }
    const parsed = apiErrorBodySchema.safeParse(error.response.data)
    if (parsed.success) {
      const { code, message, fieldErrors, details } = parsed.data.error
      return new ApiError({
        kind: 'api',
        status: error.response.status,
        code,
        message,
        fieldErrors,
        details,
      })
    }
    return new ApiError({
      kind: 'api',
      status: error.response.status,
      message: `Erro inesperado (${error.response.status}).`,
    })
  }
  return new ApiError({ kind: 'unknown', message: 'Algo deu errado. Tente novamente.' })
}

/** Mensagem curta para toasts e banners de erro. */
export function errorMessage(error: unknown) {
  return toApiError(error).message
}
