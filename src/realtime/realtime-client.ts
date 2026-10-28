import { io, type Socket } from 'socket.io-client'
import {
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  SOCKET_EVENTS,
  type NftUpdatedEvent,
  type OrderUpdatedEvent,
} from '@/contracts/realtime'
import { env } from '@/lib/env'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

interface EventMap {
  'nft.updated': NftUpdatedEvent
  'order.updated': OrderUpdatedEvent
}

type Identity = { userId: string; token: string } | null

const MAX_SEEN_EVENTS = 500

/**
 * Cliente Socket.IO da aplicação. Garante:
 * - uma conexão por identidade (troca de usuário recria o socket e descarta listeners antigos);
 * - deduplicação por eventId e descarte de versões antigas/iguais por recurso;
 * - eventos de pedido só são aceitos se pertencem ao usuário atual;
 * - aviso de reconexão para os assinantes reconciliarem via REST.
 */
export class RealtimeClient {
  private socket: Socket | null = null
  private identity: Identity = null
  private seen = new Set<string>()
  private versions = new Map<string, number>()
  private listeners = { 'nft.updated': new Set(), 'order.updated': new Set() } as {
    [K in keyof EventMap]: Set<(event: EventMap[K]) => void>
  }
  private statusListeners = new Set<(status: ConnectionStatus) => void>()
  private reconnectListeners = new Set<() => void>()
  private hasConnectedOnce = false
  status: ConnectionStatus = 'idle'

  /** Conecta como visitante (identity null) ou como usuário; idempotente por identidade. */
  connect(identity: Identity) {
    const same =
      this.socket &&
      this.identity?.userId === identity?.userId &&
      this.identity?.token === identity?.token
    if (same) return
    this.disconnect()
    this.identity = identity
    this.hasConnectedOnce = false

    const socket = io(env.socketUrl, {
      transports: ['websocket'],
      auth: identity ? { token: identity.token } : {},
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    })
    this.socket = socket
    this.setStatus('connecting')

    socket.on('connect', () => {
      this.setStatus('connected')
      if (this.hasConnectedOnce) for (const fn of this.reconnectListeners) fn()
      this.hasConnectedOnce = true
    })
    socket.on('disconnect', () => this.setStatus('reconnecting'))
    socket.io.on('reconnect_attempt', () => this.setStatus('reconnecting'))
    socket.on('connect_error', () => this.setStatus(navigator.onLine ? 'reconnecting' : 'offline'))

    socket.on(SOCKET_EVENTS.nftUpdated, (raw: unknown) => {
      const parsed = nftUpdatedEventSchema.safeParse(raw)
      if (parsed.success && this.accept(parsed.data)) this.dispatch('nft.updated', parsed.data)
    })
    socket.on(SOCKET_EVENTS.orderUpdated, (raw: unknown) => {
      const parsed = orderUpdatedEventSchema.safeParse(raw)
      if (!parsed.success) return
      // Defesa extra: nunca aplicar pedido de outro usuário (ex.: evento atrasado da sessão anterior).
      if (parsed.data.data.userId !== this.identity?.userId) return
      if (this.accept(parsed.data)) this.dispatch('order.updated', parsed.data)
    })
  }

  /** Encerra a conexão e esquece o histórico (nova sessão começa limpa). */
  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.io.removeAllListeners()
      this.socket.disconnect()
    }
    this.socket = null
    this.identity = null
    this.seen.clear()
    this.versions.clear()
    this.setStatus('idle')
  }

  on<K extends keyof EventMap>(type: K, listener: (event: EventMap[K]) => void) {
    this.listeners[type].add(listener)
    return () => {
      this.listeners[type].delete(listener)
    }
  }

  onStatus(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.add(listener)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  onReconnect(listener: () => void) {
    this.reconnectListeners.add(listener)
    return () => {
      this.reconnectListeners.delete(listener)
    }
  }

  /** Registra a versão conhecida via REST, para que eventos mais antigos sejam ignorados. */
  observeVersion(resourceType: 'nft' | 'order', id: string, version: number) {
    const key = `${resourceType}:${id}`
    if (version > (this.versions.get(key) ?? -1)) this.versions.set(key, version)
  }

  private accept(event: {
    eventId: string
    resource: { type: string; id: string }
    version: number
  }) {
    if (this.seen.has(event.eventId)) return false
    this.seen.add(event.eventId)
    if (this.seen.size > MAX_SEEN_EVENTS) this.seen.delete(this.seen.values().next().value!)

    const key = `${event.resource.type}:${event.resource.id}`
    if (event.version <= (this.versions.get(key) ?? -1)) return false
    this.versions.set(key, event.version)
    return true
  }

  private dispatch<K extends keyof EventMap>(type: K, event: EventMap[K]) {
    for (const listener of this.listeners[type]) listener(event)
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status
    for (const fn of this.statusListeners) fn(status)
  }
}

export const realtimeClient = new RealtimeClient()
