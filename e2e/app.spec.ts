import { expect, test, type Page } from '@playwright/test'

// Main user flows in a real browser, starting from the demo data (no API key needed).
// Each test gets a fresh browser context, so IndexedDB starts empty every time.

async function loadDemo(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Vyskúšať s ukážkovými dátami' }).click()
  await expect(page.getByText('Prezeráš ukážkové dáta')).toBeVisible()
}

const nav = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Hlavná navigácia' }).getByRole('button', { name }).first()

test('demo data shows the overview, the deterministic score and the board', async ({ page }) => {
  await loadDemo(page)
  await expect(page.getByText('Dnes sa treba ozvať 1 firme')).toBeVisible()
  await expect(page.getByText('Odpovedalo 2 z 4 firiem.')).toBeVisible()

  await nav(page, 'Inzeráty').click()
  await page.getByRole('button', { name: /Frontend Developer \(React\)/ }).click()
  await expect(page.getByText('78 %', { exact: true })).toBeVisible()
  await expect(page.getByText('Povinné: 3 z 3')).toBeVisible()

  await nav(page, 'Žiadosti').click()
  await expect(page.getByRole('region', { name: 'Pohovor' })).toContainText('Ukážka Tech s.r.o.')
})

test('the Back button returns from a posting to the list', async ({ page }) => {
  await loadDemo(page)
  await nav(page, 'Inzeráty').click()
  await page.getByRole('button', { name: /Dátový analytik/ }).click()
  await expect(page).toHaveURL(/#\/inzeraty\/demo-posting-analyst$/)

  await page.goBack()

  await expect(page).toHaveURL(/#\/inzeraty$/)
  await expect(page.getByRole('heading', { name: 'Inzeráty', level: 1 })).toBeVisible()
})

test('a deep link opens the posting directly', async ({ page }) => {
  await loadDemo(page)
  await page.goto('./#/inzeraty/demo-posting-fullstack')
  await expect(page.getByRole('heading', { name: 'Full-stack Developer', level: 1 })).toBeVisible()
})

test('moving an application fills in dates and records its history', async ({ page }) => {
  await loadDemo(page)
  await nav(page, 'Žiadosti').click()
  await page.getByRole('combobox', { name: 'Stav žiadosti Príklad Studio' }).selectOption('applied')
  await expect(page.getByRole('region', { name: 'Poslané' })).toContainText('Príklad Studio')

  await page.getByRole('region', { name: 'Poslané' }).getByRole('button', { name: /Príklad Studio/ }).click()
  const history = page.getByRole('list').filter({ hasText: 'Uložené' }).last()
  await expect(history).toContainText('Poslané')
  await expect(page.getByLabel('Follow-up')).not.toHaveValue('')
})

test('editing a posting keeps it and asks for a new analysis', async ({ page }) => {
  await loadDemo(page)
  await page.goto('./#/inzeraty/demo-posting-analyst')
  await page.getByRole('button', { name: 'Upraviť inzerát' }).click()
  await page.getByLabel('Text inzerátu').fill('Hľadáme dátového analytika so znalosťou SQL a Pythonu.')
  await page.getByRole('button', { name: 'Uložiť', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Dátový analytik', level: 1 })).toBeVisible()
  await expect(page.getByText('Inzerát ešte nie je analyzovaný.')).toBeVisible()
})

test('a custom synonym changes the score right away', async ({ page }) => {
  await loadDemo(page)
  await page.goto('./#/inzeraty')
  const analyst = page.getByRole('button', { name: /Dátový analytik/ })
  await expect(analyst).toContainText('0 %')

  // The demo CV has Git but not SQL; a (deliberately odd) synonym makes Git count as SQL.
  await page.goto('./#/nastavenia')
  await page.getByLabel('Zručnosť', { exact: true }).fill('SQL')
  await page.getByLabel('Iné zápisy (oddelené čiarkou)').fill('Git')
  await page.getByRole('button', { name: 'Pridať', exact: true }).click()
  await expect(page.getByText('„Git“ sa teraz počíta ako SQL.')).toBeVisible()

  await page.goto('./#/inzeraty')
  await expect(analyst).toContainText('29 %')
})

test('the interview and follow-up can be exported to a calendar', async ({ page }) => {
  await loadDemo(page)
  await page.goto('./#/ziadosti/demo-app-frontend')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Pridať do kalendára' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('jobfit-ukazka-tech-s-r-o.ics')
  const content = await (await download.createReadStream()).toArray()
  const ics = Buffer.concat(content).toString('utf8')
  expect(ics).toContain('BEGIN:VCALENDAR')
  expect(ics).toContain('SUMMARY:Pohovor: Ukážka Tech s.r.o.\\, Frontend Developer (React)')
})

test('phones navigate with the bottom bar @mobile', async ({ page }) => {
  await loadDemo(page)
  const bottomBar = page.getByRole('navigation', { name: 'Hlavná navigácia' }).last()
  await expect(bottomBar).toBeVisible()
  await bottomBar.getByRole('button', { name: 'Žiadosti' }).click()
  await expect(page).toHaveURL(/#\/ziadosti$/)
  await expect(page.getByRole('heading', { name: 'Žiadosti', level: 1 })).toBeVisible()
})
