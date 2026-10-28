import { expect, open, test } from './support/fixtures'

const resultCount = (page: import('@playwright/test').Page) =>
  page.getByText(/\d+ NFTs? encontrados?/)

const cardNames = (page: import('@playwright/test').Page) =>
  page.locator('#catalogo article h3').allTextContents()

test.describe('Catálogo', () => {
  test('busca, filtros combinados, ordenação, paginação e restauração pelo histórico', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Filtros laterais são do layout desktop; o mobile é coberto abaixo.')
    await open(page, '/')
    await expect(resultCount(page)).toHaveText('48 NFTs encontrados')

    const filters = page.getByRole('complementary', { name: 'Filtros do catálogo' })
    await filters.getByRole('button', { name: /^Música/ }).click()
    await expect(page).toHaveURL(/categories=musica/)
    await expect(resultCount(page)).toHaveText('6 NFTs encontrados')

    await filters.getByRole('button', { name: /^Arte digital/ }).click()
    await expect(resultCount(page)).toHaveText('12 NFTs encontrados')
    await filters.getByRole('button', { name: /^Ethereum/ }).click()
    await expect(page).toHaveURL(/networks=ethereum/)
    await expect(resultCount(page)).toHaveText('2 NFTs encontrados')

    // Remove o filtro de rede e ordena por maior preço.
    await page.getByRole('button', { name: 'Remover filtro Ethereum' }).click()
    await page.getByLabel('Ordenar por:').selectOption('price-desc')
    await expect(page).toHaveURL(/sort=price-desc/)
    // A lista anterior fica visível até a nova chegar (keepPreviousData): espera a ordenação.
    await expect
      .poll(async () => {
        const prices = await page.locator('#catalogo article p span.font-bold').allTextContents()
        const values = prices.map((p) => Number(p.replace(' ETH', '')))
        return values.every((v, i) => i === 0 || values[i - 1]! >= v)
      })
      .toBe(true)

    // Paginação: página 2, e qualquer mudança de filtro volta para a 1.
    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const page2 = await cardNames(page)

    // Busca textual (com debounce) compõe com os filtros e reinicia a página.
    await page.getByRole('searchbox', { name: /Buscar NFTs/ }).fill('golden')
    await expect(page).toHaveURL(/q=golden/)
    await expect(page).not.toHaveURL(/page=2/)

    // Histórico: voltar restaura exatamente a página 2 anterior.
    await page.goBack()
    await expect(page).toHaveURL(/page=2/)
    await expect.poll(() => cardNames(page)).toEqual(page2)

    // Refresh mantém o estado da URL.
    await page.reload()
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(filters.getByRole('button', { name: /^Música/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByLabel('Ordenar por:')).toHaveValue('price-desc')
  })

  test('mobile: busca e filtros pela gaveta inferior', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Fluxo específico do mobile.')
    await open(page, '/')
    await page.getByRole('searchbox', { name: /Buscar NFTs/ }).fill('nomad')
    await expect(page).toHaveURL(/q=nomad/)
    await page.getByRole('button', { name: 'Abrir filtros e ordenação' }).click()
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await sheet.getByRole('button', { name: /^Solana/ }).click()
    await expect(page).toHaveURL(/networks=solana/)
    await page.keyboard.press('Escape')
    await expect(resultCount(page)).toHaveText(/NFTs? encontrados?/)
    await expect(page.locator('#catalogo article h3').first()).toContainText(/Nomad/)
  })

  test('resultado vazio oferece limpar filtros', async ({ page }) => {
    await open(page, '/?q=nada-por-aqui')
    await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).last().click()
    await expect(resultCount(page)).toHaveText('48 NFTs encontrados')
  })

  test('respostas fora de ordem não sobrescrevem a busca mais recente', async ({
    page,
    mocks,
    isMobile,
  }) => {
    test.skip(isMobile, 'Mesmo comportamento; executado no desktop.')
    await open(page, '/')
    await mocks.scenario('out-of-order')
    const search = page.getByRole('searchbox', { name: /Buscar NFTs/ })
    // 1ª busca demora 1,5 s; a 2ª responde em 150 ms. A UI deve terminar mostrando a 2ª.
    await search.fill('golden')
    await expect(page).toHaveURL(/q=golden/)
    await search.fill('baron')
    await expect(page).toHaveURL(/q=baron/)
    await page.waitForTimeout(2000)
    const names = await cardNames(page)
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) expect(name.toLowerCase()).toMatch(/baron|ivory/)
  })

  test('skeleton durante carregamento lento', async ({ page, mocks }) => {
    await open(page, '/')
    await mocks.scenario('slow')
    await page.reload()
    await expect(page.getByText('Carregando NFTs…')).toBeVisible()
    await expect(page.locator('[data-slot="skeleton"]:visible').first()).toBeVisible()
    await expect(page.getByText(/\d+ NFTs encontrados/)).toBeVisible({ timeout: 8000 })
  })

  test('falha de servidor mostra erro e recupera ao tentar novamente', async ({ page, mocks }) => {
    await open(page, '/')
    await mocks.scenario('catalog-error')
    await page.reload()
    await expect(page.getByText('Não foi possível carregar o catálogo')).toBeVisible({
      timeout: 10_000,
    })
    await mocks.scenario('fast')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(resultCount(page)).toHaveText('48 NFTs encontrados')
  })
})

test.describe('Detalhe do NFT', () => {
  test('acesso direto, edição esgotada e limite de quantidade', async ({ page, isMobile }) => {
    await open(page, '/nft/emerald-ape-042?edition=1-1')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByText('Esta edição está esgotada. Escolha outra edição.')).toBeVisible()
    const buy = page.getByRole('button', {
      name: isMobile ? 'Edição esgotada' : 'Comprar',
      exact: true,
    })
    await expect(buy).toBeDisabled()

    await page.getByRole('radio', { name: '1/10' }).click()
    await expect(page).toHaveURL(/edition=1-10/)
    const plus = page.getByRole('button', { name: 'Aumentar quantidade de Emerald Ape #042' })
    for (let i = 0; i < 12; i++) {
      if (await plus.isDisabled()) break
      await plus.click()
    }
    await expect(plus).toBeDisabled()
    await expect(
      page.getByRole('group', { name: 'Quantidade de Emerald Ape #042' }).locator('output'),
    ).toHaveText('10')
  })

  test('NFT inexistente mostra página própria', async ({ page }) => {
    await open(page, '/nft/nao-existe')
    await expect(
      page.getByRole('heading', { name: 'Este NFT não existe ou foi removido' }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Explorar o mercado' }).click()
    await expect(page).toHaveURL(/\/#catalogo|\/$/)
  })

  test('rota inexistente mostra 404', async ({ page }) => {
    await open(page, '/rota/que/nao/existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
})
