import type { Network } from '@/contracts/common'
import type { Edition, EditionId } from '@/contracts/nft'
import { eth } from '@/lib/money'
import { hashPassword } from '../crypto'
import type { DbNft, DbState, DbUser } from './types'

export const SCHEMA_VERSION = 1

/** Data de referência fixa: fixtures não dependem do relógio real. */
export const SEED_DATE = Date.UTC(2026, 9, 1, 12, 0, 0)

export const CATEGORIES = [
  { slug: 'arte-digital', label: 'Arte digital' },
  { slug: 'fotografia', label: 'Fotografia' },
  { slug: 'musica', label: 'Música' },
  { slug: 'arte-3d', label: 'Arte 3D' },
  { slug: 'colecionaveis', label: 'Colecionáveis' },
  { slug: 'generativa', label: 'Generativa' },
  { slug: 'jogos', label: 'Jogos' },
  { slug: 'assinaturas', label: 'Assinaturas' },
  { slug: 'utilidade', label: 'Utilidade' },
] as const

const ARTS = ['emerald-ape', 'nomad-gorilla', 'baron-ape', 'golden-ape'] as const
type Art = (typeof ARTS)[number]

const ART_PROFILE: Record<Art, { collection: string; attributes: string[] }> = {
  'emerald-ape': { collection: 'Kurio Apes', attributes: ['Óculos', 'Esmeralda', 'Raro'] },
  'nomad-gorilla': { collection: 'Nomad Club', attributes: ['Chapéu', 'Moletom', 'Calmo'] },
  'baron-ape': { collection: 'Ivory Society', attributes: ['Terno', 'Gola alta', 'Elegante'] },
  'golden-ape': { collection: 'Golden Frequencies', attributes: ['Fones', 'Dourado', 'Ritmo'] },
}

/** Gerador pseudoaleatório com semente (mulberry32): fixtures idênticas a cada reset. */
export function createRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface NftSeed {
  name: string
  number: number
  art: Art
  category: (typeof CATEGORIES)[number]['slug']
  network: Network
  price: string
  compareAtPrice?: string
  rarity?: 'raro'
  editions?: EditionId[]
  soldOut?: EditionId[]
  isNew?: boolean
  trending?: number
  featured?: boolean
}

// As nove primeiras reproduzem os cards do Figma (Desktop / Início).
const FIGMA_NFTS: NftSeed[] = [
  {
    name: 'Emerald Ape',
    number: 42,
    art: 'emerald-ape',
    category: 'arte-digital',
    network: 'ethereum',
    price: '1.19',
    rarity: 'raro',
    soldOut: ['1-1'],
    trending: 98,
    featured: true,
  },
  {
    name: 'Sage Nomad',
    number: 9,
    art: 'nomad-gorilla',
    category: 'arte-digital',
    network: 'ethereum',
    price: '1.69',
    trending: 91,
    featured: true,
  },
  {
    name: 'Neon Vessel',
    number: 552,
    art: 'baron-ape',
    category: 'colecionaveis',
    network: 'polygon',
    price: '1.99',
    compareAtPrice: '2.29',
    rarity: 'raro',
    trending: 88,
  },
  {
    name: 'Cosmic Bloom',
    number: 118,
    art: 'nomad-gorilla',
    category: 'generativa',
    network: 'ethereum',
    price: '1.29',
    isNew: true,
    featured: true,
  },
  {
    name: 'Violet Nomad',
    number: 314,
    art: 'nomad-gorilla',
    category: 'musica',
    network: 'solana',
    price: '1.39',
    isNew: true,
    trending: 76,
  },
  {
    name: 'Ivory Baron',
    number: 88,
    art: 'baron-ape',
    category: 'fotografia',
    network: 'ethereum',
    price: '1.79',
    trending: 84,
  },
  {
    name: 'Golden Beat',
    number: 207,
    art: 'golden-ape',
    category: 'musica',
    network: 'polygon',
    price: '0.99',
    isNew: true,
  },
  {
    name: 'Golden Pulse',
    number: 731,
    art: 'golden-ape',
    category: 'jogos',
    network: 'solana',
    price: '0.59',
    isNew: true,
    trending: 70,
  },
  {
    name: 'Golden Signal',
    number: 160,
    art: 'golden-ape',
    category: 'utilidade',
    network: 'ethereum',
    price: '0.39',
  },
]

const NAME_POOL = [
  'Jade Monk',
  'Amber Pilot',
  'Velvet Ghost',
  'Copper Muse',
  'Onyx Drifter',
  'Saffron Echo',
  'Mossy Sage',
  'Cobalt Rider',
  'Lunar Baron',
  'Crimson Chord',
  'Dusk Wanderer',
  'Ember Scout',
  'Silk Oracle',
  'Quartz Nomad',
  'Pixel Shaman',
  'Rust Poet',
  'Velvet Baron',
  'Solar Monk',
  'Neon Drifter',
  'Coral Muse',
  'Ivory Echo',
  'Granite Sage',
  'Indigo Pilot',
  'Golden Oracle',
  'Midnight Scout',
  'Opal Rider',
  'Cedar Ghost',
  'Sapphire Chord',
  'Topaz Wanderer',
  'Obsidian Poet',
  'Tidal Shaman',
  'Echo Baron',
  'Prism Monk',
  'Static Nomad',
  'Aurora Ape',
  'Basalt Muse',
  'Flux Pilot',
  'Maple Sage',
  'Nova Signal',
]

const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']
const EDITION_SUPPLY: Record<EditionId, number | null> = {
  '1-1': 1,
  '1-10': 10,
  '1-50': 50,
  open: null,
}
const EDITION_FACTOR: Record<EditionId, string> = {
  '1-1': '5',
  '1-10': '2',
  '1-50': '1',
  open: '0.5',
}
const MAX_PER_ORDER = 10

function buildEditions(seed: NftSeed, rng: () => number): Edition[] {
  const ids = seed.editions ?? (['1-1', '1-10', '1-50', 'open'] as EditionId[])
  return ids.map((id) => {
    const supply = EDITION_SUPPLY[id]
    const soldOut = seed.soldOut?.includes(id)
    const available = soldOut
      ? 0
      : supply === null
        ? 500
        : Math.max(1, Math.ceil(supply * (0.4 + rng() * 0.6)))
    return {
      id,
      price: eth.round(eth.mul(seed.price, EDITION_FACTOR[id]), 3),
      supply,
      available,
      maxPerOrder: Math.min(available, MAX_PER_ORDER),
    }
  })
}

function toDbNft(seed: NftSeed, index: number, rng: () => number): DbNft {
  const token = String(seed.number).padStart(4, '0')
  const id = `${seed.name.toLowerCase().replace(/\s+/g, '-')}-${String(seed.number).padStart(3, '0')}`
  const profile = ART_PROFILE[seed.art]
  const category = CATEGORIES.find((c) => c.slug === seed.category)!
  const fullName = `${seed.name} #${String(seed.number).padStart(3, '0')}`
  const editions = buildEditions(seed, rng)
  const defaultEdition = editions.find((e) => e.id === '1-50') ?? editions[0]!

  return {
    id,
    name: fullName,
    tokenId: `#${token}`,
    art: seed.art,
    category,
    collection: profile.collection,
    network: seed.network,
    compareAtPrice: seed.compareAtPrice ?? null,
    defaultEditionId: defaultEdition.id,
    rarity: seed.rarity ?? 'comum',
    listedAt: new Date(SEED_DATE - index * 36 * 60 * 60 * 1000).toISOString(),
    version: 1,
    description: `Um colecionável digital finalizado à mão da coleção ${profile.collection}, verificado na ${
      seed.network === 'ethereum' ? 'Ethereum' : seed.network === 'polygon' ? 'Polygon' : 'Solana'
    }, com arte desbloqueável e acesso para colecionadores.`,
    about: `${fullName} é uma obra digital finalizada à mão da coleção ${profile.collection}. Cada atributo fica armazenado nos metadados do token e verificado na rede. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.\n\nA propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    networkInfo: 'Cunhado com procedência imutável e metadados armazenados no IPFS.',
    contractInfo:
      'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    royaltiesInfo: `0x7A42...${token}E8 · Contrato inteligente ERC-721 verificado.`,
    creator: 'Nova Sato',
    attributes: profile.attributes,
    gallery: [seed.art, seed.art, seed.art, seed.art],
    rating: Math.round((4 + rng()) * 10) / 10,
    reviewCount: 5 + Math.floor(rng() * 40),
    editions,
    isNew: seed.isNew ?? false,
    trending: seed.trending ?? Math.floor(rng() * 60),
    featured: seed.featured ?? false,
  }
}

function buildCatalog(): DbNft[] {
  const rng = createRng(20261028)
  const generated: NftSeed[] = NAME_POOL.map((name, i) => {
    const art = ARTS[i % ARTS.length]!
    const price = eth.round(String(0.02 + Math.pow(rng(), 2.2) * 12.28), 2)
    const discounted = rng() < 0.15
    return {
      name,
      number: 100 + Math.floor(rng() * 899),
      art,
      category: CATEGORIES[(i * 7 + 3) % CATEGORIES.length]!.slug,
      network: NETWORKS[(i * 5 + 1) % NETWORKS.length]!,
      price,
      compareAtPrice: discounted ? eth.round(eth.mul(price, '1.2'), 2) : undefined,
      rarity: rng() < 0.2 ? 'raro' : undefined,
      editions: rng() < 0.3 ? ['1-10', '1-50', 'open'] : undefined,
      soldOut: rng() < 0.15 ? ['1-10'] : undefined,
      isNew: i % 4 === 0,
    }
  })
  // Garante extremos da faixa de preço exibida no Figma (0,02 – 12,30 ETH).
  generated[3]!.price = '12.30'
  generated[11]!.price = '0.02'

  return [...FIGMA_NFTS, ...generated].map((seed, index) => toDbNft(seed, index, rng))
}

async function buildUser(input: Omit<DbUser, 'passwordHash' | 'salt'> & { password: string }) {
  const { password, ...rest } = input
  const salt = `salt-${input.id}`
  return { ...rest, salt, passwordHash: await hashPassword(password, salt) }
}

/** Credenciais fictícias documentadas no README. */
export const DEMO_USERS = [
  { email: 'ana@kurio.dev', password: 'Kurio@2026', name: 'Ana Colecionadora' },
  { email: 'bruno@kurio.dev', password: 'Kurio@2026', name: 'Bruno Ferreira' },
] as const

export async function createSeed(): Promise<DbState> {
  const createdAt = new Date(SEED_DATE).toISOString()
  const users = await Promise.all([
    buildUser({
      id: 'usr_ana',
      username: 'ana.kurio',
      email: DEMO_USERS[0].email,
      password: DEMO_USERS[0].password,
      displayName: DEMO_USERS[0].name,
      ensName: 'ana-kurio',
      walletNickname: 'Principal',
      avatarUrl: null,
      createdAt,
    }),
    buildUser({
      id: 'usr_bruno',
      username: 'bruno.f',
      email: DEMO_USERS[1].email,
      password: DEMO_USERS[1].password,
      displayName: DEMO_USERS[1].name,
      ensName: 'bruno-nft',
      walletNickname: 'Cofre',
      avatarUrl: null,
      createdAt,
    }),
  ])

  return {
    schemaVersion: SCHEMA_VERSION,
    nfts: buildCatalog(),
    users,
    sessions: [],
    carts: [],
    favorites: { usr_ana: ['sage-nomad-009', 'golden-beat-207'], usr_bruno: [] },
    wallets: {
      usr_ana: {
        primary: {
          id: 'wal_ana_primary',
          slot: 'primary',
          displayName: 'Ana Colecionadora',
          nickname: 'Principal',
          network: 'ethereum',
          profileName: 'ana.kurio',
          address: '0xA91F3c2B7d4e5F6a7B8c9D0e1F2a3B4c5D6eE82C',
          secondaryAddress: null,
          provider: 'metamask',
          referralCode: 'KURIO-ANA',
          email: 'ana@kurio.dev',
          ensName: 'ana-kurio',
          updatedAt: createdAt,
        },
        secondary: {
          id: 'wal_ana_secondary',
          slot: 'secondary',
          displayName: 'Ana Colecionadora',
          nickname: 'Reserva',
          network: 'polygon',
          profileName: 'ana.kurio',
          address: '0x5B21aE9f0C3d4B5a6E7f8A9b0C1d2E3f4A5b6C7D',
          secondaryAddress: 'nova.kurio.eth',
          provider: 'coinbase',
          referralCode: 'KURIO-ANA',
          email: 'ana@kurio.dev',
          ensName: 'nova-kurio',
          updatedAt: createdAt,
        },
      },
      usr_bruno: { primary: null, secondary: null },
    },
    walletConnections: {},
    coupons: [
      {
        code: 'KURIO10',
        percentOff: 10,
        expiresAt: '2099-12-31T23:59:59.000Z',
        description: '10% de desconto de lançamento',
      },
      {
        code: 'GENESIS15',
        percentOff: 15,
        expiresAt: '2099-12-31T23:59:59.000Z',
        description: '15% na coleção gênesis',
      },
      {
        code: 'VERAO2025',
        percentOff: 20,
        expiresAt: '2025-03-20T23:59:59.000Z',
        description: 'Campanha de verão 2025',
      },
    ],
    quotes: [],
    orders: [],
    idempotency: {},
  }
}
