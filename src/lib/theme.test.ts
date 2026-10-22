import { describe, expect, it } from 'vitest'
import { isDark, loadTheme, saveTheme, THEME_STORAGE_KEY } from './theme'

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const items = new Map(Object.entries(initial))
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  }
}

describe('theme', () => {
  it('defaults to system and ignores unknown stored values', () => {
    expect(loadTheme(memoryStorage())).toBe('system')
    expect(loadTheme(memoryStorage({ [THEME_STORAGE_KEY]: 'purple' }))).toBe('system')
    expect(loadTheme(null)).toBe('system')
  })

  it('saves and loads a theme', () => {
    const storage = memoryStorage()
    saveTheme('dark', storage)
    expect(loadTheme(storage)).toBe('dark')
  })

  it('resolves system to the operating system setting, explicit choices win', () => {
    expect(isDark('system', true)).toBe(true)
    expect(isDark('system', false)).toBe(false)
    expect(isDark('light', true)).toBe(false)
    expect(isDark('dark', false)).toBe(true)
  })
})
