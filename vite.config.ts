import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Com os mocks ligados, o app só renderiza depois que o MSW sobe. O chunk dos mocks é um
 * import dinâmico, então o navegador só o descobriria depois de executar o bundle principal:
 * o modulepreload no HTML faz os dois downloads correrem em paralelo.
 */
function preloadMocks(): Plugin {
  return {
    name: 'kurio:preload-mocks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const chunk = Object.values(ctx.bundle ?? {}).find(
          (output) =>
            output.type === 'chunk' && output.facadeModuleId?.endsWith('/mocks/browser.ts'),
        )
        if (chunk?.type !== 'chunk') return
        return [chunk.fileName, ...chunk.imports]
          .filter((file) => !html.includes(`/${file}"`))
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: true, href: `/${file}` },
            injectTo: 'head' as const,
          }))
      },
    },
  }
}

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    preloadMocks(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'tough-cookie': fileURLToPath(new URL('./src/mocks/vendor/tough-cookie.ts', import.meta.url)),
    },
  },
})
