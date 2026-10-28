import type { Page } from '@playwright/test'
import { addToCart, expect, loginAs, open, settleVisuals, test } from './support/fixtures'

/**
 * Regressão visual com dados estáveis (seed determinístico, cenário sem latência,
 * animações desligadas). Baselines versionadas em tests/e2e/__screenshots__.
 */
async function snap(page: Page, name: string) {
  await settleVisuals(page)
  // Toasts e o botão do painel de cenários não fazem parte do layout avaliado.
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    mask: [
      page.locator('[data-sonner-toaster]'),
      page.getByRole('button', { name: /painel de cenários/ }),
    ],
  })
}

test.describe('Regressão visual', () => {
  test('início', async ({ page }) => {
    await open(page, '/')
    await expect(page.getByText('48 NFTs encontrados')).toBeVisible()
    await snap(page, 'inicio.png')
  })

  test('detalhe do NFT', async ({ page }) => {
    await open(page, '/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Mais desta coleção' })).toBeVisible()
    await expect(page.locator('section[aria-labelledby^="row-"] article').first()).toBeVisible()
    await snap(page, 'detalhe.png')
  })

  test('carrinho', async ({ page }) => {
    await loginAs(page, 'ana', '/')
    await addToCart(page, 'emerald-ape-042', 2)
    await addToCart(page, 'violet-nomad-314', 1)
    await addToCart(page, 'ivory-baron-088', 3)
    await page.goto('/carrinho')
    await expect(page.locator('dd[aria-live]').filter({ visible: true })).toHaveText('9.156 ETH')
    await snap(page, 'carrinho.png')
  })

  test('pagamento', async ({ page }) => {
    await loginAs(page, 'ana', '/')
    await addToCart(page, 'emerald-ape-042', 2)
    await addToCart(page, 'violet-nomad-314', 1)
    await page.goto('/pagamento')
    await expect(page.getByRole('textbox', { name: /^Nome de exibição/ })).toHaveValue(
      'Ana Colecionadora',
    )
    await expect(page.locator('dd[aria-live]').filter({ visible: true })).toHaveText('3.786 ETH')
    await snap(page, 'pagamento.png')
  })
})
