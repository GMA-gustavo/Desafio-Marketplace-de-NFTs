import { createRng } from './db/seed'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface FailureRule {
  method: HttpMethod | '*'
  /** Prefixo do caminho relativo à API (ex.: "/nfts", "/favorites"). */
  path: string
  status: number | 'network'
  /** Quantas vezes falhar antes de voltar ao normal; null = sempre. */
  times: number | null
}

export interface MockConfig {
  scenario: ScenarioName
  latency: { mode: 'none' | 'fixed' | 'random'; ms: number; min: number; max: number }
  seed: number
  offline: boolean
  failures: FailureRule[]
  /** "out-of-order": respostas do catálogo alternam lenta/rápida, chegando fora de ordem. */
  catalog: 'normal' | 'empty' | 'out-of-order'
  payment: { outcome: 'confirmed' | 'rejected'; delayMs: number }
  /** Cria o pedido mas segura a resposta além do timeout do cliente (1ª tentativa). */
  orderCreateTimeout: boolean
  priceChangeOnCheckout: boolean
  soldOutOnCheckout: boolean
  walletConnection: 'approve' | 'reject'
  sessionTtlMinutes: number
}

const BASE: MockConfig = {
  scenario: 'default',
  latency: { mode: 'random', ms: 300, min: 120, max: 450 },
  seed: 42,
  offline: false,
  failures: [],
  catalog: 'normal',
  payment: { outcome: 'confirmed', delayMs: 2500 },
  orderCreateTimeout: false,
  priceChangeOnCheckout: false,
  soldOutOnCheckout: false,
  walletConnection: 'approve',
  sessionTtlMinutes: 60 * 24,
}

type Preset = { label: string; description: string; config: Partial<MockConfig> }

export const SCENARIOS = {
  default: {
    label: 'Padrão',
    description: 'Latência realista (120–450 ms) e pagamento aprovado.',
    config: {},
  },
  fast: {
    label: 'Sem latência',
    description: 'Respostas imediatas (usado nos testes).',
    config: {
      latency: { mode: 'none', ms: 0, min: 0, max: 0 },
      payment: { outcome: 'confirmed', delayMs: 800 },
    },
  },
  slow: {
    label: 'Rede lenta',
    description: 'Todas as respostas levam 2,5 s (skeletons visíveis).',
    config: { latency: { mode: 'fixed', ms: 2500, min: 0, max: 0 } },
  },
  'variable-latency': {
    label: 'Latência variável',
    description: 'Entre 100 ms e 3 s, com semente fixa.',
    config: { latency: { mode: 'random', ms: 0, min: 100, max: 3000 } },
  },
  'out-of-order': {
    label: 'Respostas fora de ordem',
    description: 'Buscas no catálogo alternam 1,5 s / 150 ms.',
    config: { catalog: 'out-of-order' },
  },
  'empty-catalog': {
    label: 'Catálogo vazio',
    description: 'A listagem de NFTs não retorna resultados.',
    config: { catalog: 'empty' },
  },
  offline: {
    label: 'Sem conexão',
    description: 'Toda chamada falha na rede e o socket cai.',
    config: { offline: true },
  },
  'catalog-error': {
    label: 'Erro 500 no catálogo',
    description: 'GET /nfts responde 500 até trocar de cenário.',
    config: { failures: [{ method: 'GET', path: '/nfts', status: 500, times: null }] },
  },
  flaky: {
    label: 'Falha transitória',
    description: 'A 1ª chamada de cada leitura falha com 503; a nova tentativa funciona.',
    config: { failures: [{ method: 'GET', path: '/', status: 503, times: 1 }] },
  },
  'favorites-error': {
    label: 'Falha ao favoritar',
    description: 'Incluir/remover favorito responde 500 (testa rollback otimista).',
    config: {
      failures: [
        { method: 'PUT', path: '/favorites', status: 500, times: null },
        { method: 'DELETE', path: '/favorites', status: 500, times: null },
      ],
    },
  },
  'short-session': {
    label: 'Sessão curta',
    description: 'Sessões expiram 1 minuto após o login.',
    config: { sessionTtlMinutes: 1 },
  },
  'price-change-checkout': {
    label: 'Preço muda no checkout',
    description: 'Ao confirmar, o preço do 1º item sobe 10% e a compra exige nova confirmação.',
    config: { priceChangeOnCheckout: true },
  },
  'sold-out-checkout': {
    label: 'Edição esgota no checkout',
    description: 'Ao confirmar, a edição do 1º item esgota.',
    config: { soldOutOnCheckout: true },
  },
  'order-timeout': {
    label: 'Timeout após criar pedido',
    description:
      'O pedido é criado, mas a resposta excede o timeout; a nova tentativa recupera o mesmo pedido.',
    config: { orderCreateTimeout: true },
  },
  'payment-rejected': {
    label: 'Pagamento recusado',
    description: 'A simulação recusa o pagamento.',
    config: { payment: { outcome: 'rejected', delayMs: 2500 } },
  },
  'wallet-rejected': {
    label: 'Carteira recusa conexão',
    description: 'A conexão com a carteira é recusada pelo usuário.',
    config: { walletConnection: 'reject' },
  },
} satisfies Record<string, Preset>

export type ScenarioName = keyof typeof SCENARIOS

export const CONFIG_STORAGE_KEY = 'kurio.mocks.config'

function presetConfig(name: ScenarioName): MockConfig {
  return { ...structuredClone(BASE), ...structuredClone(SCENARIOS[name].config), scenario: name }
}

let config: MockConfig = BASE
let rng = createRng(BASE.seed)
/** Contadores de falha por regra + método + caminho (falhas transitórias valem por endpoint). */
const failureHits = new Map<string, number>()

function save() {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch {
    /* ignora */
  }
}

export function initScenario() {
  const fromUrl = new URLSearchParams(location.search).get('scenario')
  if (fromUrl && fromUrl in SCENARIOS) {
    config = presetConfig(fromUrl as ScenarioName)
    save()
  } else {
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
      config = raw ? { ...BASE, ...(JSON.parse(raw) as Partial<MockConfig>) } : BASE
    } catch {
      config = BASE
    }
  }
  rng = createRng(config.seed)
  failureHits.clear()
}

export const scenario = {
  get config() {
    return config
  },
  set(name: ScenarioName) {
    config = presetConfig(name)
    rng = createRng(config.seed)
    failureHits.clear()
    save()
  },
  patch(partial: Partial<MockConfig>) {
    config = { ...config, ...partial }
    if (partial.seed !== undefined) rng = createRng(config.seed)
    failureHits.clear()
    save()
  },
  /** Latência da próxima resposta, determinística dada a semente. */
  nextLatency(): number {
    const { mode, ms, min, max } = config.latency
    if (mode === 'none') return 0
    if (mode === 'fixed') return ms
    return Math.round(min + rng() * (max - min))
  },
  /** Retorna a regra de falha aplicável (e contabiliza), ou null. */
  matchFailure(method: string, path: string): FailureRule | null {
    for (const [index, rule] of config.failures.entries()) {
      if (rule.method !== '*' && rule.method !== method) continue
      if (!path.startsWith(rule.path)) continue
      const key = `${index}|${method}|${path}`
      const hits = failureHits.get(key) ?? 0
      if (rule.times !== null && hits >= rule.times) continue
      failureHits.set(key, hits + 1)
      return rule
    }
    return null
  },
}
