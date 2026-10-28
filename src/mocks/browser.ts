import { setupWorker } from 'msw/browser'
import { env } from '@/lib/env'
import { mockControl } from './control'
import { initDb } from './db/store'
import { handlers } from './handlers'
import { initScenario } from './scenarios'
import { startOrderSettlement } from './services/orders'

export const worker = setupWorker(...handlers)

export async function startMockWorker() {
  initScenario()
  await initDb()
  await worker.start({
    onUnhandledRequest: ({ url }, print) => {
      // Só avisa sobre chamadas à API; assets e fontes passam direto.
      if (new URL(url).pathname.startsWith(env.apiUrl)) print.warning()
    },
    quiet: import.meta.env.PROD,
  })
  startOrderSettlement()
  window.__kurioMocks = mockControl
}
