import { delay } from 'msw'
import type { CreateOrderInput, Order } from '@/contracts/order'
import { hashPayload, randomHex, randomId } from '../crypto'
import { db } from '../db/store'
import type { DbOrder, DbUser } from '../db/types'
import { MockApiError } from '../http'
import { publishOrderUpdated } from '../realtime'
import { scenario } from '../scenarios'
import { computeQuote, issueQuote, resolveCart, touch } from './cart'
import { updateNft } from './nft-updates'

/** Excede o timeout do cliente HTTP (10 s). */
const SLOW_RESPONSE_MS = 12_000

/** Chaves que já sofreram o timeout simulado (só a 1ª tentativa atrasa). */
const timedOutKeys = new Set<string>()
let priceChangeApplied = false
let soldOutApplied = false

export function toOrderDto(order: DbOrder): Order {
  const { cartId: _c, quoteId: _q, settleAt: _s, outcome: _o, ...dto } = order
  return dto
}

/** Aplica, uma vez por cenário, a alteração de preço/estoque "durante a compra". */
function applyCheckoutDisruptions(
  cartItems: { nftId: string; editionId: Order['items'][number]['editionId'] }[],
) {
  const first = cartItems[0]
  if (!first) return
  if (scenario.config.priceChangeOnCheckout && !priceChangeApplied) {
    priceChangeApplied = true
    updateNft(first.nftId, { editionId: first.editionId, priceFactor: '1.1' })
  }
  if (scenario.config.soldOutOnCheckout && !soldOutApplied) {
    soldOutApplied = true
    updateNft(first.nftId, { editionId: first.editionId, available: 0 })
  }
}

export function resetCheckoutDisruptions() {
  priceChangeApplied = false
  soldOutApplied = false
  timedOutKeys.clear()
}

/**
 * Criação idempotente: mesma chave + mesmo corpo devolve o pedido existente;
 * mesma chave com corpo diferente é conflito.
 */
export async function createOrder(
  request: Request,
  user: DbUser,
  input: CreateOrderInput,
  key: string,
) {
  const bodyHash = await hashPayload(input)
  const existing = db.state.idempotency[key]
  if (existing) {
    if (existing.userId !== user.id || existing.bodyHash !== bodyHash) {
      throw new MockApiError(
        'idempotency_conflict',
        'Esta tentativa de compra já foi usada com dados diferentes. Revise o pedido e confirme novamente.',
      )
    }
    const order = db.state.orders.find((o) => o.id === existing.orderId)!
    return { order, replayed: true }
  }

  const cart = resolveCart(request, user)
  if (!cart.items.length) throw new MockApiError('cart_empty', 'Seu carrinho está vazio.')

  applyCheckoutDisruptions(cart.items)

  // Revalida: a cotação enviada precisa ser idêntica à vigente.
  const stored = db.state.quotes.find((q) => q.id === input.quoteId && q.cartId === cart.id)
  const current = computeQuote(cart, input.network)
  if (!current.quote.valid) {
    throw new MockApiError(
      'insufficient_stock',
      'Alguns itens não estão mais disponíveis na quantidade escolhida.',
      {
        details: { quote: issueQuote(cart, input.network) },
      },
    )
  }
  if (!stored || new Date(stored.expiresAt).getTime() < Date.now()) {
    throw new MockApiError('quote_expired', 'A cotação expirou. Revise os valores atualizados.', {
      details: { quote: issueQuote(cart, input.network) },
    })
  }
  if (stored.fingerprint !== current.fingerprint) {
    throw new MockApiError(
      'quote_changed',
      'Preço, disponibilidade ou taxas mudaram. Revise e confirme novamente.',
      {
        details: { quote: issueQuote(cart, input.network) },
      },
    )
  }

  const walletSet = db.state.wallets[user.id]
  const wallet = [walletSet?.primary, walletSet?.secondary].find((w) => w?.id === input.walletId)
  if (!wallet) throw new MockApiError('wallet_required', 'Selecione uma carteira cadastrada.')
  const connection = db.state.walletConnections[wallet.id]
  if (connection?.status !== 'connected') {
    throw new MockApiError('wallet_required', 'Conecte a carteira antes de confirmar a compra.')
  }

  const quote = current.quote
  const now = Date.now()
  const order: DbOrder = {
    id: randomId('ord'),
    userId: user.id,
    status: 'pending',
    network: input.network,
    wallet: {
      id: wallet.id,
      label: wallet.nickname,
      address: wallet.address,
      provider: wallet.provider,
    },
    items: quote.lines.map((l) => ({
      nftId: l.nftId,
      editionId: l.editionId,
      name: l.name,
      tokenId: l.tokenId,
      art: l.art,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    })),
    couponCode: quote.coupon?.status === 'applied' ? quote.coupon.code : null,
    subtotal: quote.subtotal,
    discount: quote.discount,
    networkFee: quote.networkFee,
    total: quote.total,
    txHash: null,
    explorerUrl: null,
    failureReason: null,
    createdAt: new Date(now).toISOString(),
    settledAt: null,
    version: 1,
    cartId: cart.id,
    quoteId: stored.id,
    settleAt: now + scenario.config.payment.delayMs,
    outcome: scenario.config.payment.outcome,
  }

  db.write((s) => {
    s.orders.push(order)
    s.idempotency[key] = { userId: user.id, bodyHash, orderId: order.id }
  })
  // Reserva o estoque enquanto o pagamento está pendente.
  for (const item of order.items) {
    updateNft(item.nftId, { editionId: item.editionId, availableDelta: -item.quantity })
  }
  publishOrderUpdated(toOrderDto(order))

  if (scenario.config.orderCreateTimeout && !timedOutKeys.has(key)) {
    timedOutKeys.add(key)
    await delay(SLOW_RESPONSE_MS)
  }
  return { order, replayed: false }
}

function settle(order: DbOrder) {
  const confirmed = order.outcome === 'confirmed'
  db.write((s) => {
    const target = s.orders.find((o) => o.id === order.id)!
    target.status = confirmed ? 'confirmed' : 'rejected'
    target.settledAt = new Date().toISOString()
    target.version += 1
    if (confirmed) {
      target.txHash = randomHex(32)
      target.explorerUrl = `https://sepolia.etherscan.io/tx/${target.txHash}`
      // Remove do carrinho apenas o que foi comprado, na quantidade comprada.
      const cart = s.carts.find((c) => c.id === target.cartId)
      if (cart) {
        for (const bought of target.items) {
          const line = cart.items.find(
            (i) => i.nftId === bought.nftId && i.editionId === bought.editionId,
          )
          if (line) line.quantity -= bought.quantity
        }
        cart.items = cart.items.filter((i) => i.quantity > 0)
        if (!cart.items.length) cart.couponCode = null
        touch(cart)
      }
    } else {
      target.failureReason = 'O pagamento foi recusado pela carteira (simulação).'
    }
  })
  const updated = db.state.orders.find((o) => o.id === order.id)!
  if (!confirmed) {
    for (const item of updated.items) {
      updateNft(item.nftId, { editionId: item.editionId, availableDelta: item.quantity })
    }
  }
  publishOrderUpdated(toOrderDto(updated))
}

/** Liquida pedidos vencidos; roda em intervalo e também antes de leituras (sobrevive a refresh). */
export function settleDueOrders() {
  const now = Date.now()
  for (const order of db.state.orders) {
    if (order.status === 'pending' && order.settleAt <= now) settle(order)
  }
}

export function startOrderSettlement() {
  settleDueOrders()
  return window.setInterval(settleDueOrders, 400)
}

/** Usado pelo painel/testes para liquidar já um pedido pendente. */
export function settleNow(orderId: string, outcome?: 'confirmed' | 'rejected') {
  db.write((s) => {
    const order = s.orders.find((o) => o.id === orderId && o.status === 'pending')
    if (!order) return
    order.settleAt = Date.now()
    if (outcome) order.outcome = outcome
  })
  settleDueOrders()
}
