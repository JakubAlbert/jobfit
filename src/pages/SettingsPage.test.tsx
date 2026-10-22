import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DEFAULT_MODEL } from '../lib/settings'
import { SettingsPage } from './SettingsPage'

// Smoke test without a DOM: the page renders even when localStorage is unavailable (as in Node).
describe('SettingsPage', () => {
  it('renders the key form with the default model and the data section', () => {
    const html = renderToString(<SettingsPage />)

    expect(html).toContain('API kľúč')
    expect(html).toContain(`value="${DEFAULT_MODEL}"`)
    expect(html).toContain('Exportovať zálohu')
    expect(html).toContain('Vymazať všetky dáta')
  })
})
