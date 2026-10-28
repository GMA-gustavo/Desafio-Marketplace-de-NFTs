import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { Order } from '@/contracts/order'
import {
  SOCKET_EVENTS,
  type NftUpdatedEvent,
  type OrderUpdatedEvent,
  type RealtimeEvent,
} from '@/contracts/realtime'
import { env } from '@/lib/env'
import type { DbNft } from './db/types'
import { isSessionActive, sessionByToken } from './services/auth'
import { scenario } from './scenarios'

/**
 * Servidor Socket.IO simulado sobre o interceptador de WebSocket do MSW.
 * O socket.io-client real conecta em `${env.socketUrl}/socket.io/?EIO=4&transport=websocket`.
 */
const realtime = ws.link(`${env.socketUrl}/*`)

interface Connection {
  id: number
  userId: string | null
  io: ReturnType<typeof toSocketIo>
  close: (code?: number, reason?: string) => void
}

const connections = new Set<Connection>()
const recentEvents: RealtimeEvent[] = []
let nextConnectionId = 1

/** O binding não envia pings; sem eles o cliente derruba a conexão por timeout. */
const PING_INTERVAL_MS = 20_000

export const realtimeHandler = realtime.addEventListener('connection', (connection) => {
  const { client } = connection
  if (scenario.config.offline) {
    client.close(1011, 'offline')
    return
  }

  const conn: Connection = {
    id: nextConnectionId++,
    userId: null,
    io: toSocketIo(connection),
    close: (code, reason) => client.close(code, reason),
  }
  connections.add(conn)

  // Pacote CONNECT do Socket.IO ("40{...}") carrega o `auth` do cliente.
  client.addEventListener('message', (event) => {
    if (typeof event.data !== 'string' || !event.data.startsWith('40')) return
    try {
      const auth = JSON.parse(event.data.slice(2) || '{}') as { token?: string }
      const session = sessionByToken(auth.token ?? null)
      conn.userId = session && isSessionActive(session) ? session.userId : null
    } catch {
      conn.userId = null
    }
  })

  const ping = setInterval(() => client.send('2'), PING_INTERVAL_MS)
  client.addEventListener('close', () => {
    clearInterval(ping)
    connections.delete(conn)
  })
})

function remember(event: RealtimeEvent) {
  recentEvents.push(event)
  if (recentEvents.length > 50) recentEvents.shift()
}

function send(event: RealtimeEvent, target?: (c: Connection) => boolean) {
  if (scenario.config.offline) return
  for (const conn of connections) {
    if (!target || target(conn)) conn.io.client.emit(event.type, event)
  }
}

export function publishNftUpdated(nft: DbNft) {
  const defaultEdition = nft.editions.find((e) => e.id === nft.defaultEditionId) ?? nft.editions[0]!
  const event: NftUpdatedEvent = {
    eventId: crypto.randomUUID(),
    type: SOCKET_EVENTS.nftUpdated,
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: {
      price: defaultEdition.price,
      compareAtPrice: nft.compareAtPrice,
      available: nft.editions.reduce((sum, e) => sum + e.available, 0),
      editions: nft.editions.map(({ id, price, available, maxPerOrder }) => ({
        id,
        price,
        available,
        maxPerOrder,
      })),
    },
  }
  remember(event)
  send(event)
}

/** Pedidos só vão para as conexões autenticadas do dono. */
export function publishOrderUpdated(order: Order) {
  const event: OrderUpdatedEvent = {
    eventId: crypto.randomUUID(),
    type: SOCKET_EVENTS.orderUpdated,
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: new Date().toISOString(),
    data: order,
  }
  remember(event)
  send(event, (c) => c.userId === order.userId)
}

/** Controles para cenários e testes de tolerância do cliente. */
export const realtimeControl = {
  connectionCount: () => connections.size,
  /** Reenvia o último evento (mesmo eventId) — o cliente deve ignorar a duplicata. */
  replayLast(type?: RealtimeEvent['type']) {
    const event = [...recentEvents].reverse().find((e) => !type || e.type === type)
    if (!event) return false
    send(
      event,
      event.type === SOCKET_EVENTS.orderUpdated
        ? (c) => c.userId === (event as OrderUpdatedEvent).data.userId
        : undefined,
    )
    return true
  },
  /** Envia uma versão antiga de um NFT com dados diferentes — não pode regredir o estado. */
  sendStaleNft(nft: DbNft) {
    const stale: NftUpdatedEvent = {
      eventId: crypto.randomUUID(),
      type: SOCKET_EVENTS.nftUpdated,
      resource: { type: 'nft', id: nft.id },
      version: Math.max(0, nft.version - 1),
      occurredAt: new Date(Date.now() - 60_000).toISOString(),
      data: {
        price: '0.01',
        compareAtPrice: null,
        available: 999,
        editions: nft.editions.map(({ id, maxPerOrder }) => ({
          id,
          price: '0.01',
          available: 999,
          maxPerOrder,
        })),
      },
    }
    send(stale)
  },
  /** Derruba todas as conexões; o cliente deve reconectar e reconciliar via REST. */
  disconnectAll() {
    for (const conn of connections) conn.close(1012, 'simulated restart')
  },
}
