import { createSeed, SCHEMA_VERSION } from './seed'
import type { DbState } from './types'

export const DB_STORAGE_KEY = 'kurio.mocks.db'

let state: DbState | null = null

function persist() {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota cheia (ex.: avatares grandes): mantém em memória.
  }
}

function load(): DbState | null {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DbState
    return parsed.schemaVersion === SCHEMA_VERSION ? parsed : null
  } catch {
    return null
  }
}

/** Carrega o estado persistido ou gera o seed determinístico. */
export async function initDb() {
  state = load() ?? (await createSeed())
  persist()

  // Outra aba alterou o "backend": recarrega para manter os dados coerentes.
  window.addEventListener('storage', (event) => {
    if (event.key === DB_STORAGE_KEY && event.newValue) {
      state = JSON.parse(event.newValue) as DbState
    }
  })
}

export const db = {
  get state(): DbState {
    if (!state) throw new Error('Mock DB não inicializado')
    return state
  },
  /** Toda escrita passa por aqui para persistir em seguida. */
  write<T>(mutate: (s: DbState) => T): T {
    const result = mutate(db.state)
    persist()
    return result
  },
  async reset() {
    state = await createSeed()
    persist()
  },
}
