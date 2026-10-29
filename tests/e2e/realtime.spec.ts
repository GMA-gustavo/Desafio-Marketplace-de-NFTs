import { addToCart, expect, loginAs, open, test } from './support/fixtures'

/**
 * Todos os eventos saem do servidor simulado pelo Socket.IO (`socket.io-client` real,
 * interceptado pelo MSW). Nenhum teste altera a UI diretamente.
 */
test.describe('Tempo real (Socket.IO)', () => {
  test('preço e disponibilidade mudam com o carrinho aberto', async ({ page, mocks }) => {
    await open(page, '/')
    await addToCart(page, 'emerald-ape-042', 2)
    await page.goto('/carrinho')
    const total = page.locator('dd[aria-live]').filter({ visible: true })
    await expect(total).toHaveText('2.396 ETH')
    await expect.poll(() => mocks.socketConnections()).toBeGreaterThan(0)

    await mocks.changePrice('emerald-ape-042', '1.5', '1-50')
    await expect(
      page.getByText(/O preço de Emerald Ape #042 mudou desde que você o adicionou/),
    ).toBeVisible()
    await expect(
      page.getByText('Preço subiu: de 1.19 ETH para 1.785 ETH').filter({ visible: true }),
    ).toBeVisible()
    await expect(total).toHaveText('3.586 ETH')

    await mocks.sellOut('emerald-ape-042', '1-50')
    await expect(
      page
        .getByText('Edição esgotada — remova este item para continuar.')
        .filter({ visible: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Conectar e finalizar' }).filter({ visible: true }),
    ).toBeDisabled()
  })

  test('checkout recebe a alteração e impede confirmar com cotação desatualizada', async ({
    page,
    mocks,
  }) => {
    await loginAs(page, 'ana', '/')
    await addToCart(page, 'golden-beat-207', 1)
    await page.goto('/pagamento')
    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await page
      .getByRole('button', { name: 'Revisar e confirmar compra' })
      .filter({ visible: true })
      .click()
    const review = page.getByRole('dialog', { name: 'Revise sua compra' })
    await expect(review.locator('dd[aria-live]')).toHaveText('1.006 ETH')

    // Preço muda via Socket.IO com a revisão aberta: a cotação antiga não pode ser confirmada.
    // O goto recarregou a página; o evento só chega depois de o socket reconectar.
    await expect.poll(() => mocks.socketConnections()).toBeGreaterThan(0)
    await mocks.changePrice('golden-beat-207', '2', '1-50')
    await expect(page.getByText(/O preço de Golden Beat #207 mudou/)).toBeVisible()
    await review.getByRole('button', { name: 'Confirmar compra' }).click()
    const changed = page.getByRole('dialog', { name: /Os valores mudaram/ })
    await expect(changed.getByRole('row', { name: /Total/ })).toContainText('1.996 ETH')
    expect((await mocks.ordersOf()).length).toBe(0)
  })

  test('eventos duplicados e antigos não regridem o estado', async ({ page, mocks }) => {
    await open(page, '/nft/sage-nomad-009')
    await expect(page.getByText('1.69 ETH').filter({ visible: true }).first()).toBeVisible()
    await expect.poll(() => mocks.socketConnections()).toBeGreaterThan(0)

    await mocks.changePrice('sage-nomad-009', '2', '1-50')
    const price = page.getByTestId('nft-price').filter({ visible: true }).first()
    await expect(price).toContainText('3.38 ETH')

    // Reenvio do mesmo evento (mesmo eventId) e um evento com versão antiga e preço diferente.
    await mocks.replayLastEvent()
    await mocks.sendStaleNft('sage-nomad-009')
    await page.waitForTimeout(800)
    await expect(price).toContainText('3.38 ETH')
    await expect(page.getByText('0.01 ETH')).toHaveCount(0)
  })

  test('reconexão reconcilia com a API REST', async ({ page, mocks }) => {
    await open(page, '/nft/ivory-baron-088')
    await expect.poll(() => mocks.socketConnections()).toBeGreaterThan(0)
    await mocks.patch({ offline: true })
    await mocks.disconnectSockets()
    // Durante a queda o servidor muda o preço; o evento não chega a ninguém.
    await page.evaluate(() => window.__kurioMocks!.changePrice('ivory-baron-088', '2', '1-50'))
    await page.waitForTimeout(600)
    await mocks.patch({ offline: false })
    // Ao reconectar, o cliente invalida as queries ativas e busca o estado atual via REST.
    await expect(page.getByText('3.58 ETH').filter({ visible: true }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('pedido pendente é retomado após desconexão e refresh, sem nova compra', async ({
    page,
    mocks,
  }) => {
    await loginAs(page, 'ana', '/')
    await addToCart(page, 'golden-beat-207', 1)
    await mocks.patch({ payment: { outcome: 'confirmed', delayMs: 60_000 } })
    await page.goto('/pagamento')
    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await page
      .getByRole('button', { name: 'Revisar e confirmar compra' })
      .filter({ visible: true })
      .click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação do pagamento' }),
    ).toBeVisible()
    const orderUrl = page.url()

    // Queda de conexão + saída da página: o aviso global aponta para o pedido.
    await mocks.disconnectSockets()
    await page.goto('/')
    await expect(page.getByText('Você tem uma compra aguardando confirmação.')).toBeVisible()
    await page.getByRole('link', { name: 'Ver pedido' }).click()
    await expect(page).toHaveURL(orderUrl)
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação do pagamento' }),
    ).toBeVisible()

    // O servidor confirma: o evento order.updated chega e a página vira recibo.
    const [pending] = await mocks.pendingOrders()
    await mocks.settleOrder(pending!.id)
    await expect(
      page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' }),
    ).toBeVisible()
    expect((await mocks.ordersOf()).length).toBe(1)
  })
})
