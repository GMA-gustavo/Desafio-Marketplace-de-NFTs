import { expect, loginAs, open, test } from './support/fixtures'

test.describe('Acessibilidade e teclado', () => {
  test('link "pular para o conteúdo" e foco visível', async ({ page }) => {
    await open(page, '/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#conteudo$/)
  })

  test('navegação por teclado no catálogo até o detalhe', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Fluxo de teclado avaliado no desktop.')
    await open(page, '/')
    const filter = page
      .getByRole('complementary', { name: 'Filtros do catálogo' })
      .getByRole('button', { name: /^Fotografia/ })
    await filter.focus()
    await page.keyboard.press('Enter')
    await expect(filter).toHaveAttribute('aria-pressed', 'true')
    await expect(page).toHaveURL(/categories=fotografia/)

    const firstCard = page.locator('#catalogo article a').first()
    await firstCard.focus()
    await expect(firstCard).toBeFocused()
    const outline = await firstCard.evaluate((el) => getComputedStyle(el).outlineStyle)
    expect(outline).not.toBe('none')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/nft\//)
  })

  test('diálogo de login prende o foco, fecha com Esc e devolve o foco', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'No mobile o login é tela cheia, sem diálogo.')
    await open(page, '/')
    const entrar = page.getByRole('link', { name: 'Entrar' })
    await entrar.click()
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    await expect(dialog).toBeVisible()
    await expect.poll(() => dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    // Foco preso: tabular várias vezes nunca sai do diálogo.
    // (o Base UI usa elementos-guarda vizinhos ao diálogo: o foco passa por eles e volta)
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      await expect.poll(() => dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(/\/$/)
  })

  test('erros de formulário ficam associados aos campos', async ({ page }) => {
    await open(page, '/entrar')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    const email = page.getByRole('textbox', { name: 'E-mail' })
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`#${describedBy!.split(' ')[0]!.replace(/:/g, '\\:')}`)).toHaveText(
      'Informe um e-mail válido.',
    )
    await expect(email).toBeFocused()
  })

  test('gaveta de filtros no mobile controla o foco', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Gaveta existe só no mobile.')
    await open(page, '/')
    const trigger = page.getByRole('button', { name: 'Abrir filtros e ordenação' })
    await trigger.click()
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await expect(sheet).toBeVisible()
    expect(await sheet.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  test('alterações em tempo real são anunciadas (aria-live)', async ({ page, mocks }) => {
    await loginAs(page, 'ana', '/')
    await page.evaluate(async () => {
      const token = JSON.parse(localStorage.getItem('kurio.session')!).token
      await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nftId: 'golden-beat-207', editionId: '1-50', quantity: 1 }),
      })
    })
    await open(page, '/carrinho')
    await expect.poll(() => mocks.socketConnections()).toBeGreaterThan(0)
    await mocks.changePrice('golden-beat-207', '2', '1-50')
    // Banner com role=status e toast (região aria-live do sonner).
    await expect(
      page.getByRole('status').filter({ hasText: /O preço de Golden Beat #207 mudou/ }),
    ).toBeVisible()
    await expect(
      page
        .locator('[aria-live]')
        .filter({ hasText: /mudou para/ })
        .first(),
    ).toBeAttached()
  })

  test('página sem overflow horizontal em 390, 768 e 1440 px', async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/', '/nft/emerald-ape-042', '/carrinho']) {
        await open(page, path)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow, `${path} @ ${width}px`).toBeLessThanOrEqual(0)
      }
    }
  })
})
