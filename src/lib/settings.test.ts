import { beforeEach, describe, expect, it } from 'vitest'
import { clearSettings, DEFAULT_MODEL, loadSettings, saveSettings } from './settings'

class MemoryStorage implements Storage {
  private items = new Map<string, string>()
  get length() {
    return this.items.size
  }
  clear() {
    this.items.clear()
  }
  getItem(key: string) {
    return this.items.get(key) ?? null
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.items.delete(key)
  }
  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
}

let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
})

describe('settings', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadSettings(storage)).toEqual({ apiKey: '', model: DEFAULT_MODEL })
  })

  it('saves and loads settings, trimming whitespace', () => {
    expect(saveSettings({ apiKey: '  key-123 ', model: ' gemini-x ' }, storage)).toBe(true)
    expect(loadSettings(storage)).toEqual({ apiKey: 'key-123', model: 'gemini-x' })
  })

  it('falls back to the default model when the model is empty', () => {
    saveSettings({ apiKey: 'k', model: '   ' }, storage)
    expect(loadSettings(storage).model).toBe(DEFAULT_MODEL)
  })

  it('ignores corrupted stored data', () => {
    storage.setItem('jobfit.settings', '{not json')
    expect(loadSettings(storage)).toEqual({ apiKey: '', model: DEFAULT_MODEL })
  })

  it('reports failure when storage is unavailable', () => {
    expect(saveSettings({ apiKey: 'k', model: 'm' }, null)).toBe(false)
    expect(loadSettings(null)).toEqual({ apiKey: '', model: DEFAULT_MODEL })
  })

  it('clears stored settings', () => {
    saveSettings({ apiKey: 'k', model: 'm' }, storage)
    clearSettings(storage)
    expect(loadSettings(storage).apiKey).toBe('')
  })
})
