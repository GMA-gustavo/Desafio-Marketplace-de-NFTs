import type { Page } from '@playwright/test'
import { addToCart, expect, loginAs, open, test, type Mocks } from './support/fixtures'

/** Abre o pagamento com carrinho montado e a carteira principal conectada pela UI. */
async function preparedCheckout(page: Page, items: [string, number][] = [['golden-beat-207', 2]]) {
  await loginAs(page, 'ana', '/')
  for (const [nftId, qty] of items) await addToCart(page, nftId, qty)
  await page.goto('/pagamento')
  await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await expect(page.getByText('Pronta para assinar a compra.')).toBeVisible()
}

const reviewButton = (page: Page) =>
  page.getByRole('button', { name: 'Revisar e confirmar compra' }).filter({ visible: true })

async function openReview(page: Page) {
  await reviewButton(page).click()
  const dialog = page.getByRole('dialog', { name: 'Revise sua compra' })
  await expect(dialog).toBeVisible()
  return dialog
}

async function totalOrders(mocks: Mocks) {
  return (await mocks.ordersOf()).length
}

test.describe('Checkout e pedido', () => {
  test('compra completa: do catálogo ao recibo confirmado', async ({ page, isMobile }) => {
    await loginAs(page, 'ana', '/')
    await page
      .locator('#catalogo')
      .getByRole('link', { name: /Golden Beat #207/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/nft\/golden-beat-207/)
    await page
      .getByRole('button', { name: isMobile ? 'Comprar NFT' : 'Comprar', exact: true })
      .click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await page
      .getByRole('button', { name: 'Conectar e finalizar' })
      .filter({ visible: true })
      .click()
    await expect(page).toHaveURL(/\/pagamento$/)

    // Validação: sem carteira conectada não abre a revisão.
    await reviewButton(page).click()
    await expect(
      page.getByText('Conecte a carteira selecionada antes de revisar a compra.'),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await expect(page.getByText('Pronta para assinar a compra.')).toBeVisible()

    const dialog = await openReview(page)
    await expect(dialog.getByText('Golden Beat #207')).toBeVisible()
    await expect(dialog.locator('dd[aria-live]')).toHaveText('1.006 ETH')
    await dialog.getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(page).toHaveURL(/\/pedidos\/ord_/)
    await expect(
      page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' }),
    ).toBeVisible()
    await expect(
      page.getByText('Transação confirmada na Ethereum.', { exact: false }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /Ver no Etherscan/ })).toHaveAttribute(
      'href',
      /etherscan\.io\/tx\/0x/,
    )

    // Recibo é snapshot: mudar o preço depois não altera os valores.
    const orderUrl = page.url()
    await page.evaluate(() => window.__kurioMocks!.changePrice('golden-beat-207', '3'))
    await page.reload()
    await expect(page).toHaveURL(orderUrl)
    await expect(page.locator('main dd').filter({ hasText: '1.006 ETH' }).first()).toBeVisible()

    // Itens comprados saíram do carrinho.
    await page.goto('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('formulário valida campos do layout antes da revisão', async ({ page }) => {
    await preparedCheckout(page)
    const form = page.locator('main form')
    const email = form.getByRole('textbox', { name: /^E-mail/ })
    await email.fill('invalido')
    await form.getByRole('textbox', { name: /^Código de indicação/ }).fill('x')
    await reviewButton(page).click()
    await expect(page.getByText('Revise os campos destacados.')).toBeVisible()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Use de 4 a 16 letras, números ou hífen.')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('pagamento recusado preserva o carrinho', async ({ page, mocks }) => {
    await preparedCheckout(page)
    await mocks.patch({ payment: { outcome: 'rejected', delayMs: 500 } })
    const dialog = await openReview(page)
    await dialog.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
    await expect(page.getByText(/os itens continuam no seu carrinho/)).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page.getByText('Golden Beat #207').filter({ visible: true }).first()).toBeVisible()
  })

  test('cliques repetidos criam um único pedido', async ({ page, mocks }) => {
    await preparedCheckout(page)
    await mocks.patch({ latency: { mode: 'fixed', ms: 700, min: 0, max: 0 } })
    const dialog = await openReview(page)
    const confirm = dialog.getByRole('button', { name: 'Confirmar compra' })
    // Três cliques no mesmo tick, antes do botão ser desabilitado.
    await confirm.evaluate((button: HTMLButtonElement) => {
      button.click()
      button.click()
      button.click()
    })
    await expect(page).toHaveURL(/\/pedidos\/ord_/)
    expect(await totalOrders(mocks)).toBe(1)
  })

  test('timeout após criar o pedido recupera o mesmo pedido pela idempotência', async ({
    page,
    mocks,
  }) => {
    test.setTimeout(60_000)
    await preparedCheckout(page)
    await mocks.scenario('order-timeout')
    await mocks.patch({ latency: { mode: 'none', ms: 0, min: 0, max: 0 } })
    const dialog = await openReview(page)
    await dialog.getByRole('button', { name: 'Confirmar compra' }).click()
    // O servidor criou o pedido, mas a resposta passou do timeout de 10 s do cliente.
    await expect(dialog.getByText(/Verificando se o pedido já foi criado/)).toBeVisible({
      timeout: 15_000,
    })
    await expect(page).toHaveURL(/\/pedidos\/ord_/, { timeout: 20_000 })
    expect(await totalOrders(mocks)).toBe(1)
  })

  test('preço alterado ao confirmar exige nova confirmação', async ({ page, mocks }) => {
    await preparedCheckout(page)
    await mocks.scenario('price-change-checkout')
    await mocks.patch({ latency: { mode: 'none', ms: 0, min: 0, max: 0 } })
    const dialog = await openReview(page)
    await dialog.getByRole('button', { name: 'Confirmar compra' }).click()

    const changed = page.getByRole('dialog', { name: /Os valores mudaram/ })
    await expect(changed).toBeVisible()
    await expect(changed.getByRole('row', { name: /Total/ })).toContainText('1.996 ETH')
    await expect(changed.getByRole('row', { name: /Total/ })).toContainText('2.194 ETH')
    expect(await totalOrders(mocks)).toBe(0)

    await changed.getByRole('button', { name: 'Revisar com novos valores' }).click()
    const review = page.getByRole('dialog', { name: 'Revise sua compra' })
    await expect(review.locator('dd[aria-live]')).toHaveText('2.194 ETH')
    await review.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(
      page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' }),
    ).toBeVisible()
  })

  test('edição esgotada durante a compra bloqueia a confirmação', async ({ page, mocks }) => {
    await preparedCheckout(page)
    await mocks.scenario('sold-out-checkout')
    await mocks.patch({ latency: { mode: 'none', ms: 0, min: 0, max: 0 } })
    const dialog = await openReview(page)
    await dialog.getByRole('button', { name: 'Confirmar compra' }).click()
    const changed = page.getByRole('dialog', { name: /Os valores mudaram/ })
    await expect(changed.getByText('Esgotado')).toBeVisible()
    await expect(changed.getByRole('button', { name: 'Revisar com novos valores' })).toHaveCount(0)
    expect(await totalOrders(mocks)).toBe(0)
  })

  test('carteira recusa a conexão e depois conecta', async ({ page, mocks }) => {
    await loginAs(page, 'ana', '/')
    await addToCart(page, 'golden-beat-207', 1)
    await mocks.scenario('wallet-rejected')
    await page.goto('/pagamento')
    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await expect(
      page.getByText('A conexão foi recusada na carteira. Tente novamente.'),
    ).toBeVisible()
    await mocks.scenario('fast')
    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await page.getByRole('button', { name: 'Desconectar' }).click()
    await expect(page.getByRole('button', { name: 'Conectar MetaMask' })).toBeVisible()
  })

  test('sessão expirada no checkout preserva o rascunho após novo login', async ({
    page,
    mocks,
  }) => {
    await preparedCheckout(page)
    await page
      .getByLabel('Observação do colecionador (opcional)')
      .fill('Entregar na carteira principal')
    await mocks.expireSessions()
    await reviewButton(page).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)
    await page.getByPlaceholder('contato@email.com').fill('ana@kurio.dev')
    await page.getByPlaceholder('Senha').fill('Kurio@2026')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/pagamento$/)
    await expect(page.getByLabel('Observação do colecionador (opcional)')).toHaveValue(
      'Entregar na carteira principal',
    )
  })

  test('pedido de outro usuário é negado', async ({ page, mocks }) => {
    await preparedCheckout(page)
    const dialog = await openReview(page)
    await dialog.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/pedidos\/ord_/)
    const orderPath = new URL(page.url()).pathname
    await page.evaluate(() => localStorage.removeItem('kurio.session'))
    await loginAs(page, 'bruno', orderPath)
    await expect(
      page.getByRole('heading', { name: 'Este pedido pertence a outra conta' }),
    ).toBeVisible()
    void mocks
  })
})

test('visitante no pagamento vai ao login', async ({ page }) => {
  await open(page, '/pagamento')
  await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)
})
