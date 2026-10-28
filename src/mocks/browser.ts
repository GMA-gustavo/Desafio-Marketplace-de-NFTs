import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

export async function startMockWorker() {
  await worker.start({
    onUnhandledRequest: ({ url }, print) => {
      // Só avisa sobre chamadas à API; assets e fontes passam direto.
      if (new URL(url).pathname.startsWith('/api')) print.warning()
    },
    quiet: import.meta.env.PROD,
  })
}
