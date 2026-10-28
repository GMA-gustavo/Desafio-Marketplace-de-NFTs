import { api, expect, loginAs, test, USERS } from './support/fixtures'

const field = (page: import('@playwright/test').Page, name: RegExp) =>
  page.locator('main form').first().getByRole('textbox', { name })

test.describe('Perfil e carteiras', () => {
  test('edição de perfil com erro de conflito e persistência após refresh', async ({ page }) => {
    await loginAs(page, 'ana', '/perfil')
    await field(page, /^Nome de usuário/).fill('bruno.f')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Este nome de usuário já está em uso.')).toBeVisible()

    await field(page, /^Nome de usuário/).fill('ana.kurio')
    await field(page, /^Nome de exibição/).fill('Ana K. Silva')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil atualizado.')).toBeVisible()
    await page.reload()
    await expect(field(page, /^Nome de exibição/)).toHaveValue('Ana K. Silva')
  })

  test('alteração de senha valida e passa a valer no login', async ({ page }) => {
    await loginAs(page, 'ana', '/perfil')
    await page.getByLabel('Senha atual').fill('errada123')
    await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha1')
    await page.getByLabel('Confirmar nova senha').fill('NovaSenha2')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('As senhas não conferem.')).toBeVisible()

    await page.getByLabel('Confirmar nova senha').fill('NovaSenha1')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('A senha atual está incorreta.')).toBeVisible()

    await page.getByLabel('Senha atual').fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByLabel('Senha atual')).toHaveValue('')

    const oldLogin = await api(page, 'POST', '/auth/login', {
      email: USERS.ana.email,
      password: USERS.ana.password,
    })
    const newLogin = await api(page, 'POST', '/auth/login', {
      email: USERS.ana.email,
      password: 'NovaSenha1',
    })
    expect(oldLogin.status).toBe(401)
    expect(newLogin.status).toBe(200)
  })

  test('avatar: rejeita arquivo grande, aceita imagem válida e remove', async ({ page }) => {
    await loginAs(page, 'ana', '/perfil')
    const input = page.locator('input[type="file"]')
    await input.setInputFiles({
      name: 'grande.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(600 * 1024),
    })
    await expect(page.getByText('A imagem deve ter no máximo 512 KB.')).toBeVisible()

    // PNG 1×1 válido
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
      'base64',
    )
    await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png })
    await expect(page.getByRole('img', { name: 'Seu avatar atual' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('img', { name: 'Seu avatar atual' })).toBeVisible()

    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(page.getByRole('img', { name: 'Seu avatar atual' })).toHaveCount(0)
  })

  test('carteiras: validação de endereço, cadastro da secundária e uso no pagamento', async ({
    page,
  }) => {
    await loginAs(page, 'bruno', '/perfil/carteiras')
    const primary = page.locator('main form').first()
    await primary.getByRole('textbox', { name: /^Endereço da carteira/ }).fill('0x123')
    await primary.getByRole('textbox', { name: /^Código de indicação/ }).fill('BRUNO-01')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText(/Endereço inválido/)).toBeVisible()

    await primary
      .getByRole('textbox', { name: /^Endereço da carteira/ })
      .fill('0x1111111111111111111111111111111111111111')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira principal salva.')).toBeVisible()

    await page.getByRole('checkbox', { name: 'Igual à carteira principal' }).check()
    await page.getByRole('button', { name: 'Adicionar' }).click()
    const secondary = page.locator('main form').nth(1)
    await expect(secondary.getByRole('textbox', { name: /^Endereço da carteira/ })).toHaveValue(
      '0x1111111111111111111111111111111111111111',
    )
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira secundária salva.')).toBeVisible()

    await page.reload()
    await expect(page.locator('main form')).toHaveCount(2)
    const wallets = await api<{ primary: { nickname: string }; secondary: { nickname: string } }>(
      page,
      'GET',
      '/wallets',
    )
    expect(wallets.body.secondary.nickname).toBe('Reserva')
  })
})
