import { addToCart, expect, loginAs, open, test } from './support/fixtures'

test.describe('Favoritos', () => {
  test('atualização otimista, rollback em falha e persistência', async ({
    page,
    mocks,
    isMobile,
  }) => {
    await loginAs(page, 'ana', '/nft/emerald-ape-042')
    // O rótulo muda com o estado (Favoritar ↔ Favoritado / Remover…), então o seletor cobre ambos.
    const favoriteButton = isMobile
      ? page.getByRole('button', {
          name: /^(Favoritar|Remover) Emerald Ape #042( dos favoritos)?$/,
        })
      : page.getByRole('button', { name: /^Favorit(ar|ado)$/ })
    await expect(favoriteButton).toHaveAttribute('aria-pressed', 'false')

    await mocks.scenario('favorites-error')
    await mocks.patch({ latency: { mode: 'fixed', ms: 600, min: 0, max: 0 } })
    await favoriteButton.click()
    // Otimista: muda antes da resposta…
    await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true')
    // …e volta ao estado anterior quando a API falha.
    await expect(favoriteButton).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByText(/Não foi possível favoritar Emerald Ape #042/)).toBeVisible()

    await mocks.scenario('fast')
    await favoriteButton.click()
    await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true')
    await page.goto('/favoritos')
    await expect(page.getByText('Emerald Ape #042')).toBeVisible()
  })

  test('visitante é levado ao login ao favoritar', async ({ page }) => {
    await open(page, '/nft/emerald-ape-042')
    await page
      .getByRole('button', { name: /^Favoritar$|Favoritar Emerald Ape #042/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fnft%2Femerald-ape-042/)
  })
})

test.describe('Carrinho', () => {
  test('adicionar, alterar quantidade, remover e persistir após refresh', async ({
    page,
    isMobile,
  }) => {
    await open(page, '/nft/violet-nomad-314')
    if (isMobile) {
      await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
      await expect(page.getByText('Violet Nomad #314 adicionado ao carrinho.')).toBeVisible()
    } else {
      // No frame desktop só há COMPRAR: a quantidade sai do seletor.
      await page.getByRole('button', { name: 'Aumentar quantidade de Violet Nomad #314' }).click()
    }
    await page
      .getByRole('button', { name: isMobile ? 'Comprar NFT' : 'Comprar', exact: true })
      .click()
    await expect(page).toHaveURL(/\/carrinho$/)
    // A URL muda antes de a página do carrinho substituir a do NFT, que tem um seletor igual.
    await expect(
      page.getByRole('button', { name: 'Conectar e finalizar' }).filter({ visible: true }),
    ).toBeVisible()

    const increase = page.getByRole('button', { name: 'Aumentar quantidade de Violet Nomad #314' })
    const quantity = page
      .getByRole('group', { name: 'Quantidade de Violet Nomad #314' })
      .locator('output')
    await expect(quantity).toHaveText('2')
    await increase.click()
    await expect(quantity).toHaveText('3')
    // Total vem da cotação da API: 3 × 1.39 + 0.016
    await expect(page.locator('dd[aria-live]').filter({ visible: true })).toHaveText('4.186 ETH')

    await page.reload()
    await expect(quantity).toHaveText('3')

    await page.getByRole('button', { name: 'Remover Violet Nomad #314 do carrinho' }).click()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('cupom inválido, expirado, aplicado e removido', async ({ page }) => {
    await open(page, '/')
    await addToCart(page, 'sage-nomad-009', 2)
    await page.goto('/carrinho')
    const total = page.locator('dd[aria-live]').filter({ visible: true })
    await expect(total).toHaveText('3.396 ETH')

    const code = page.getByRole('textbox', { name: 'Código promocional' }).filter({ visible: true })
    const apply = page.getByRole('button', { name: 'Aplicar' }).filter({ visible: true })
    await code.fill('NAOEXISTE')
    await apply.click()
    await expect(page.getByText('Este código não existe.').filter({ visible: true })).toBeVisible()
    await code.fill('VERAO2025')
    await apply.click()
    await expect(page.getByText('Este cupom expirou.').filter({ visible: true })).toBeVisible()
    await code.fill('kurio10')
    await apply.click()
    // 3.38 − 10% (0.338) + 0.016
    await expect(total).toHaveText('3.058 ETH')

    await page
      .getByRole('button', { name: 'Remover cupom KURIO10' })
      .filter({ visible: true })
      .click()
    await expect(total).toHaveText('3.396 ETH')
  })

  test('quantidade respeita a disponibilidade da edição', async ({ page }) => {
    await open(page, '/')
    await addToCart(page, 'emerald-ape-042', 10, '1-10')
    await page.goto('/carrinho')
    await expect(
      page.getByRole('button', { name: 'Aumentar quantidade de Emerald Ape #042' }),
    ).toBeDisabled()
  })

  test('itens do usuário persistem após login em outra sessão', async ({ page }) => {
    await loginAs(page, 'bruno', '/')
    await addToCart(page, 'ivory-baron-088', 1)
    await page.evaluate(() => localStorage.removeItem('kurio.session'))
    await loginAs(page, 'bruno', '/carrinho')
    await expect(page.getByText('Ivory Baron #088').filter({ visible: true }).first()).toBeVisible()
  })
})
