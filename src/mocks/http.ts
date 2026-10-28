import { delay, http, HttpResponse, type DefaultBodyType, type PathParams } from 'msw'
import type { z } from 'zod'
import type { ApiErrorBody, ApiErrorCode } from '@/contracts/common'
import { env } from '@/lib/env'
import { scenario, type HttpMethod } from './scenarios'

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  validation_error: 422,
  unauthorized: 401,
  session_expired: 401,
  invalid_credentials: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  email_taken: 409,
  username_taken: 409,
  insufficient_stock: 409,
  edition_unavailable: 409,
  quote_changed: 409,
  quote_expired: 409,
  idempotency_conflict: 409,
  wallet_rejected: 409,
  wallet_required: 409,
  cart_empty: 409,
  coupon_invalid: 422,
  coupon_expired: 422,
  transient: 503,
}

/** Erro de domínio lançado pelos resolvers e convertido em resposta HTTP. */
export class MockApiError extends Error {
  readonly code: ApiErrorCode
  readonly extra: { fieldErrors?: Record<string, string>; details?: unknown }

  constructor(code: ApiErrorCode, message: string, extra: MockApiError['extra'] = {}) {
    super(message)
    this.code = code
    this.extra = extra
  }
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  extra: MockApiError['extra'] = {},
) {
  const body: ApiErrorBody = { error: { code, message, ...extra } }
  return HttpResponse.json(body, { status: STATUS_BY_CODE[code] })
}

/** Valida o corpo com o mesmo schema zod usado pelos formulários. */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    throw new MockApiError('validation_error', 'Corpo da requisição inválido.')
  }
  const result = schema.safeParse(json)
  if (!result.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_'
      fieldErrors[key] ??= issue.message
    }
    throw new MockApiError('validation_error', 'Verifique os campos destacados.', { fieldErrors })
  }
  return result.data
}

type Resolver<P extends PathParams> = (info: {
  request: Request
  params: P
  url: URL
}) => Promise<Response | HttpResponse<DefaultBodyType>> | Response | HttpResponse<DefaultBodyType>

const factories = {
  GET: http.get,
  POST: http.post,
  PUT: http.put,
  PATCH: http.patch,
  DELETE: http.delete,
} as const

/**
 * Define um endpoint mockado. Antes do resolver aplica, nesta ordem:
 * modo offline → regra de falha do cenário → latência configurada.
 */
export function route<P extends PathParams = PathParams>(
  method: HttpMethod,
  path: string,
  resolver: Resolver<P>,
) {
  return factories[method]<P>(`${env.apiUrl}${path}`, async ({ request, params }) => {
    const url = new URL(request.url)
    const apiPath = url.pathname.slice(env.apiUrl.length) || '/'
    const config = scenario.config

    if (config.offline) {
      await delay(300)
      return HttpResponse.error()
    }

    const failure = scenario.matchFailure(method, apiPath)
    await delay(scenario.nextLatency())

    if (failure) {
      if (failure.status === 'network') return HttpResponse.error()
      const code: ApiErrorCode = failure.status >= 500 ? 'transient' : 'conflict'
      return HttpResponse.json(
        {
          error: {
            code,
            message: `Falha simulada (${failure.status}) pelo cenário "${config.scenario}".`,
          },
        } satisfies ApiErrorBody,
        { status: failure.status },
      )
    }

    try {
      return await resolver({ request, params: params as P, url })
    } catch (error) {
      if (error instanceof MockApiError)
        return errorResponse(error.code, error.message, error.extra)
      console.error('[mocks] erro inesperado no handler', method, path, error)
      return errorResponse('transient', 'Erro interno na simulação.')
    }
  })
}

export const json = HttpResponse.json.bind(HttpResponse)
export const noContent = () => new HttpResponse(null, { status: 204 })
