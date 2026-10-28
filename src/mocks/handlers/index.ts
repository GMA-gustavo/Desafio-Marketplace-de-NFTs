import { http, HttpResponse } from 'msw'
import { env } from '@/lib/env'

const api = (path: string) => `${env.apiUrl}${path}`

export const handlers = [http.get(api('/health'), () => HttpResponse.json({ status: 'ok' }))]
