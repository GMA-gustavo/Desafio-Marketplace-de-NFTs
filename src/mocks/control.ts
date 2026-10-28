import type { EditionId } from '@/contracts/nft'
import { db, DB_STORAGE_KEY } from './db/store'
import { DEMO_USERS } from './db/seed'
import { realtimeControl } from './realtime'
import {
  CONFIG_STORAGE_KEY,
  scenario,
  SCENARIOS,
  type MockConfig,
  type ScenarioName,
} from './scenarios'
import { expireAllSessions } from './services/auth'
import { findNft } from './services/catalog'
import { updateNft, type NftChange } from './services/nft-updates'
import { resetCheckoutDisruptions, settleNow } from './services/orders'

/** Prefixo das chaves do app no localStorage (sessão, carrinho do visitante, pedido pendente). */
const APP_STORAGE_PREFIX = 'kurio.'

/**
 * API de controle da simulação. Exposta em `window.__kurioMocks` para o painel de cenários
 * e para o Playwright: altera dados SEMPRE pelo "servidor" (REST + Socket.IO), nunca pela UI.
 */
export const mockControl = {
  scenarios: SCENARIOS,
  demoUsers: DEMO_USERS,
  getConfig: (): MockConfig => structuredClone(scenario.config),
  setScenario(name: ScenarioName) {
    scenario.set(name)
    resetCheckoutDisruptions()
  },
  patchConfig(partial: Partial<MockConfig>) {
    scenario.patch(partial)
  },
  /** Restaura o seed e limpa o estado do cliente; mantém o cenário escolhido. */
  async reset({ reload = true }: { reload?: boolean } = {}) {
    await db.reset()
    resetCheckoutDisruptions()
    for (const key of Object.keys(localStorage)) {
      if (
        key.startsWith(APP_STORAGE_PREFIX) &&
        key !== CONFIG_STORAGE_KEY &&
        key !== DB_STORAGE_KEY
      ) {
        localStorage.removeItem(key)
      }
    }
    sessionStorage.clear()
    if (reload) location.reload()
  },
  getNft: (id: string) => structuredClone(findNft(id)),
  updateNft: (id: string, change: NftChange) => structuredClone(updateNft(id, change)),
  changePrice: (id: string, factor = '1.1', editionId?: EditionId) =>
    structuredClone(updateNft(id, { priceFactor: factor, editionId })),
  sellOut: (id: string, editionId?: EditionId) =>
    structuredClone(updateNft(id, { available: 0, editionId })),
  /** Primeiro item do carrinho de um usuário (útil para cenários de checkout). */
  cartItems: (userId?: string) =>
    structuredClone(db.state.carts.find((c) => (userId ? c.userId === userId : true))?.items ?? []),
  expireSessions: () => expireAllSessions(),
  settleOrder: (id: string, outcome?: 'confirmed' | 'rejected') => settleNow(id, outcome),
  pendingOrders: () => structuredClone(db.state.orders.filter((o) => o.status === 'pending')),
  realtime: realtimeControl,
}

export type MockControl = typeof mockControl

declare global {
  interface Window {
    __kurioMocks?: MockControl
  }
}
