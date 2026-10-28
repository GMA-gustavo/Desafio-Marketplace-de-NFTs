import { test as base, expect, type Page } from '@playwright/test'
import type { MockConfig, ScenarioName } from '../../../src/mocks/scenarios'

export const USERS = {
  ana: { id: 'usr_ana', email: 'ana@kurio.dev', password: 'Kurio@2026', name: 'Ana Colecionadora' },
  bruno: {
    id: 'usr_bruno',
    email: 'bruno@kurio.dev',
    password: 'Kurio@2026',
    name: 'Bruno Ferreira',
  },
} as const
export type UserKey = keyof typeof USERS

/**
 * Acesso à API de controle da simulação (`window.__kurioMocks`). Tudo o que ela faz passa
 * pelo "servidor" — handlers MSW e eventos Socket.IO —, nunca pela UI.
 */
export class Mocks {
  constructor(private readonly page: Page) {}

  async ready() {
    await this.page.waitForFunction(() => Boolean(window.__kurioMocks))
  }

  async scenario(name: ScenarioName) {
    await this.ready()
    await this.page.evaluate((n) => window.__kurioMocks!.setScenario(n), name)
  }

  async patch(config: Partial<MockConfig>) {
    await this.ready()
    await this.page.evaluate((c) => window.__kurioMocks!.patchConfig(c), config)
  }

  async changePrice(nftId: string, factor: string, editionId?: string) {
    await this.page.evaluate(
      ([id, f, e]) => window.__kurioMocks!.changePrice(id!, f!, e as never),
      [nftId, factor, editionId],
    )
  }

  async sellOut(nftId: string, editionId?: string) {
    await this.page.evaluate(
      ([id, e]) => window.__kurioMocks!.sellOut(id!, e as never),
      [nftId, editionId],
    )
  }

  async expireSessions() {
    await this.page.evaluate(() => window.__kurioMocks!.expireSessions())
  }

  async replayLastEvent() {
    return this.page.evaluate(() => window.__kurioMocks!.realtime.replayLast())
  }

  async sendStaleNft(nftId: string) {
    await this.page.evaluate((id) => {
      const nft = window.__kurioMocks!.getNft(id)
      if (nft) window.__kurioMocks!.realtime.sendStaleNft(nft)
    }, nftId)
  }

  async disconnectSockets() {
    await this.page.evaluate(() => window.__kurioMocks!.realtime.disconnectAll())
  }

  async socketConnections() {
    return this.page.evaluate(() => window.__kurioMocks!.realtime.connectionCount())
  }

  async pendingOrders() {
    return this.page.evaluate(() => window.__kurioMocks!.pendingOrders())
  }

  async settleOrder(orderId: string, outcome?: 'confirmed' | 'rejected') {
    await this.page.evaluate(
      ([id, o]) => window.__kurioMocks!.settleOrder(id!, o as never),
      [orderId, outcome],
    )
  }

  /** Lista de pedidos do usuário logado, via REST (o mesmo que a UI consome). */
  async ordersOf() {
    return this.page.evaluate(async () => {
      const token = JSON.parse(localStorage.getItem('kurio.session') ?? 'null')?.token
      const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
      return ((await res.json()) as { items: { id: string; status: string }[] }).items
    })
  }
}

/** Chamada REST como o usuário atual (para preparar estado sem passar pela UI). */
export async function api<T = unknown>(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ method, path, body, extraHeaders }) => {
      const session = JSON.parse(localStorage.getItem('kurio.session') ?? 'null')
      const guest = JSON.parse(localStorage.getItem('kurio.guestCartId') ?? 'null')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extraHeaders,
      }
      if (session) headers.Authorization = `Bearer ${session.token}`
      if (guest) headers['X-Cart-Id'] = guest
      const res = await fetch(`/api${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const text = await res.text()
      return { status: res.status, body: text ? JSON.parse(text) : null }
    },
    { method, path, body, extraHeaders },
  ) as Promise<{ status: number; body: T }>
}

export const test = base.extend<{ mocks: Mocks; isMobile: boolean }>({
  page: async ({ page }, use) => {
    // Cenário sem latência por padrão (determinístico); cada teste pode trocar.
    await page.addInitScript(() => {
      if (!localStorage.getItem('kurio.mocks.config')) {
        localStorage.setItem(
          'kurio.mocks.config',
          JSON.stringify({
            scenario: 'fast',
            latency: { mode: 'none', ms: 0, min: 0, max: 0 },
            payment: { outcome: 'confirmed', delayMs: 800 },
          }),
        )
      }
    })
    await use(page)
  },
  mocks: async ({ page }, use) => {
    await use(new Mocks(page))
  },
  isMobile: async ({ viewport }, use) => {
    await use((viewport?.width ?? 1440) < 768)
  },
})

export { expect }

/** Abre a rota e espera a camada de mocks estar ativa. */
export async function open(page: Page, path: string) {
  await page.goto(path)
  await page.waitForFunction(() => Boolean(window.__kurioMocks))
  // O app só renderiza depois do MSW ativo.
  await page.locator('main#conteudo').waitFor()
}

/** Autentica via API (rápido) e recarrega: a sessão é recuperada como após um refresh. */
export async function loginAs(page: Page, user: UserKey, path = '/') {
  await open(page, path)
  const { email, password } = USERS[user]
  const res = await api<{ session: { token: string; expiresAt: string }; user: { id: string } }>(
    page,
    'POST',
    '/auth/login',
    { email, password },
  )
  await page.evaluate((s) => localStorage.setItem('kurio.session', JSON.stringify(s)), {
    ...res.body.session,
    userId: res.body.user.id,
  })
  await page.reload()
  await page.waitForFunction(() => Boolean(window.__kurioMocks))
}

/** Adiciona ao carrinho pela API (como visitante ou usuário, conforme a sessão salva). */
export async function addToCart(page: Page, nftId: string, quantity = 1, editionId = '1-50') {
  if (!(await page.evaluate(() => localStorage.getItem('kurio.session')))) {
    // O app cria o carrinho do visitante ao carregar; usa o mesmo id para não haver corrida.
    await page.waitForFunction(() => Boolean(localStorage.getItem('kurio.guestCartId')))
  }
  const res = await api(page, 'POST', '/cart/items', { nftId, editionId, quantity })
  expect(res.status).toBe(201)
}

/** Espera imagens e fontes carregadas (screenshots estáveis). */
export async function settleVisuals(page: Page) {
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img[loading="lazy"]')) {
      ;(img as HTMLImageElement).loading = 'eager'
    }
    await document.fonts.ready
    await Promise.all(
      [...document.images]
        .filter((img) => !img.complete)
        .map((img) => new Promise((r) => img.addEventListener('load', r, { once: true }))),
    )
  })
}
