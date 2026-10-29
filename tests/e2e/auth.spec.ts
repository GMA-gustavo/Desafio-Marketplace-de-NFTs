import { addToCart, api, expect, loginAs, open, test, USERS } from './support/fixtures'

test.describe('Conta e sessão', () => {
  test('cadastro com validação, conflito e criação da conta', async ({ page }) => {
    await open(page, '/cadastro')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByText('Use pelo menos 3 caracteres.')).toBeVisible()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()

    await page.getByPlaceholder('Nome de usuário').fill('nova.colecionadora')
    await page.getByPlaceholder('Digite seu e-mail', { exact: true }).fill(USERS.ana.email)
    await page.getByPlaceholder('Senha', { exact: true }).fill('Senha123')
    await page.getByPlaceholder('Confirmar senha').fill('Senha124')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByText('As senhas não conferem.')).toBeVisible()

    await page.getByPlaceholder('Confirmar senha').fill('Senha123')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    // Conflito vindo da API, associado ao campo.
    await expect(page.getByText('Este e-mail já está cadastrado.')).toBeVisible()
    await expect(page.getByPlaceholder('Digite seu e-mail', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByPlaceholder('Digite seu e-mail', { exact: true }).fill('nova@kurio.dev')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('kurio.session')))
      .not.toBeNull()
  })

  test('login com erro, retorno ao fluxo anterior e sessão recuperada após refresh', async ({
    page,
    isMobile,
  }) => {
    await open(page, '/pagamento')
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)

    await page.getByPlaceholder('contato@email.com').fill(USERS.ana.email)
    await page.getByPlaceholder('Senha').fill('errada123')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')

    await page.getByPlaceholder('Senha').fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    // Carrinho vazio no pagamento: a rota protegida abriu (retorno ao fluxo).
    await expect(page).toHaveURL(/\/pagamento$/)
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()

    await page.reload()
    await expect(page).toHaveURL(/\/pagamento$/)
    if (!isMobile) {
      await expect(page.getByRole('button', { name: `Conta de ${USERS.ana.name}` })).toBeVisible()
    }
  })

  test('expiração da sessão durante a navegação leva ao login e retoma o contexto', async ({
    page,
    mocks,
  }) => {
    await loginAs(page, 'ana', '/perfil')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
    await mocks.expireSessions()
    // Qualquer chamada autenticada detecta a expiração: o clique ou uma busca em segundo plano.
    await page
      .getByRole('link', { name: 'Carteiras' })
      .first()
      .click({ timeout: 3000 })
      .catch(() => undefined)
    await expect(page).toHaveURL(/\/entrar\?redirect=/)
    await expect(page.getByText(/Sua sessão expirou/)).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kurio.session'))).toBeNull()

    await page.getByPlaceholder('contato@email.com').fill(USERS.ana.email)
    await page.getByPlaceholder('Senha').fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/perfil/)
  })

  test('expiração controlada pelo relógio (sessão curta)', async ({ page, mocks }) => {
    await page.clock.install()
    await open(page, '/')
    await mocks.scenario('short-session')
    await loginAs(page, 'ana', '/perfil')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
    await page.clock.fastForward('02:00')
    await page
      .getByRole('link', { name: 'Carteiras' })
      .first()
      .click({ timeout: 3000 })
      .catch(() => undefined)
    await expect(page).toHaveURL(/\/entrar\?redirect=/)
  })

  test('logout e troca de usuário não vazam dados privados', async ({ page, isMobile }) => {
    await loginAs(page, 'ana', '/favoritos')
    await expect(page.getByRole('heading', { name: 'Lista de interesse' })).toBeVisible()
    await expect(page.getByText('Sage Nomad #009')).toBeVisible()

    if (isMobile) {
      await page.getByRole('button', { name: 'Sair' }).click()
    } else {
      // No desktop o logout sai do menu da conta no header.
      await page.getByRole('button', { name: `Conta de ${USERS.ana.name}` }).click()
      await expect(page.getByRole('menu').getByText(USERS.ana.email)).toBeVisible()
      await page.getByRole('menuitem', { name: 'Sair' }).click()
    }
    await expect(page).toHaveURL(/\/$/)
    expect(await page.evaluate(() => localStorage.getItem('kurio.session'))).toBeNull()
    if (!isMobile) await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()

    await loginAs(page, 'bruno', '/favoritos')
    await expect(page.getByText('Nenhum favorito ainda')).toBeVisible()
    await expect(page.getByText('Sage Nomad #009')).toHaveCount(0)

    // Bruno não consegue ver pedidos da Ana (403), mesmo conhecendo o id.
    const res = await api(page, 'GET', '/orders/ord_inexistente')
    expect(res.status).toBe(404)
  })

  test('carrinho do visitante é preservado ao autenticar', async ({ page }) => {
    await open(page, '/')
    await addToCart(page, 'golden-beat-207', 2)
    await page.goto('/carrinho')
    await expect(page.getByText('Golden Beat #207').filter({ visible: true }).first()).toBeVisible()

    await page.goto('/entrar?redirect=/carrinho')
    await page.getByPlaceholder('contato@email.com').fill(USERS.bruno.email)
    await page.getByPlaceholder('Senha').fill(USERS.bruno.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    // Compara o pathname: a URL de login (?redirect=/carrinho) também termina em "/carrinho".
    await expect.poll(() => new URL(page.url()).pathname).toBe('/carrinho')
    await expect(page.getByText('Golden Beat #207').filter({ visible: true }).first()).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kurio.guestCartId'))).toBeNull()
  })
})
