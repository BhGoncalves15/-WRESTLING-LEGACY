import { expect, test, type Page } from '@playwright/test'

async function navigate(page: Page, route: string) {
  const mobile = page.getByRole('button', { name: 'Abrir navegação' })
  if (await mobile.isVisible()) await mobile.click()
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: route, exact: true }).click()
}

test('cria BH, negocia, retoma o combate e importa o save em outra carreira', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'O ringue é seu.' })).toBeVisible()
  await expect(page.getByText('NXT New Year’s Evil')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  if (process.env.QA_SCREENSHOTS) await page.screenshot({ path: process.env.QA_SCREENSHOTS + '/home-' + testInfo.project.name + '.png', fullPage: true })

  const main = page.getByRole('main')
  await main.getByRole('button', { name: 'Nova carreira' }).click()
  await main.getByRole('button', { name: 'Usar exemplo BH' }).click()
  await expect(main.getByLabel('Nome de ringue')).toHaveValue('BH')
  await expect(main.getByLabel('Estilo', { exact: true })).toHaveValue('Highflyer')
  await main.getByRole('button', { name: 'Continuar' }).click()
  await expect(main.getByText(/0 de 180 pontos disponíveis/)).toBeVisible()
  await main.getByRole('button', { name: 'Continuar' }).click()
  await expect(main.getByRole('combobox')).toHaveCount(20)
  await main.getByRole('button', { name: 'Criar carreira' }).click()
  await expect(main.getByRole('button', { name: /Assinar com/ })).toHaveCount(3)
  const nxt = main.locator('.offer').filter({ has: page.getByRole('heading', { name: 'WWE NXT', exact: true }) })
  await nxt.getByText('Negociar pagamento').click()
  await nxt.getByRole('button', { name: 'Enviar contraproposta' }).click()
  await expect(nxt.getByText(/Contraproposta aceita|Proposta original mantida/)).toBeVisible()
  await nxt.getByRole('button', { name: 'Assinar com NXT' }).click()
  await main.getByRole('button', { name: 'Avançar calendário' }).click()
  await expect(main.getByText('Turno 1', { exact: true })).toBeVisible()
  if (process.env.QA_SCREENSHOTS) await page.screenshot({ path: process.env.QA_SCREENSHOTS + '/fight-' + testInfo.project.name + '.png', fullPage: true })
  await main.getByRole('button', { name: /^Dropkick / }).click()
  await expect(main.getByText('Turno 2', { exact: true })).toBeVisible()
  await page.reload()
  await expect(main.getByText('Turno 2', { exact: true })).toBeVisible()

  let turns = 0
  const result = main.getByRole('heading', { name: /Vitória por|Derrota por/ })
  const readTurn = () => main.locator('.page-title .chip').innerText()
  while (!(await result.isVisible()) && turns++ < 65) {
    const before = await readTurn()
    const rival = main.locator('.rival-corner')
    const condition = Number(await rival.getByRole('meter', { name: 'Condição' }).getAttribute('aria-valuenow'))
    const pin = main.getByRole('button', { name: /^Buscar o pinfall/ })
    const kick = main.getByRole('button', { name: /^Dropkick / })
    if (condition < 55 && await pin.isEnabled()) await pin.click()
    else if (await kick.isEnabled()) await kick.click()
    else await main.getByRole('button', { name: /^Recuperar o fôlego/ }).click()
    await expect.poll(readTurn).not.toBe(before)
  }
  await expect(result).toBeVisible()
  await expect(main.getByText(/\+\d+ XP/)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await navigate(page, 'Salvamentos')
  await main.getByRole('button', { name: 'Salvar agora' }).click()
  await expect(main.getByText('Carreira salva.')).toBeVisible()
  const downloaded = page.waitForEvent('download')
  await main.getByRole('button', { name: 'Exportar' }).click()
  const download = await downloaded
  const save = testInfo.outputPath('carreira.json')
  await download.saveAs(save)
  await main.getByLabel('Arquivo de carreira').setInputFiles(save)
  await expect(main.getByText('Carreira importada como uma cópia independente.')).toBeVisible()
  await expect(main.getByRole('button', { name: 'Abrir carreira' })).toHaveCount(2)
  expect(errors).toEqual([])
})
