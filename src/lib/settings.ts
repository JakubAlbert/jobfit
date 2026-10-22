// User settings live in localStorage, never in IndexedDB. That keeps the API key out of
// backups (exports only read IndexedDB) and it never leaves this browser except in requests to Google.

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite'

const STORAGE_KEY = 'jobfit.settings'

export interface Settings {
  apiKey: string
  model: string
}

const DEFAULTS: Settings = { apiKey: '', model: DEFAULT_MODEL }

// Storage access can throw (private mode, blocked site data), so every call is guarded.
function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function loadSettings(storage: Storage | null = browserStorage()): Settings {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULTS }
    const { apiKey, model } = parsed as Partial<Record<keyof Settings, unknown>>
    return {
      apiKey: typeof apiKey === 'string' ? apiKey : DEFAULTS.apiKey,
      model: typeof model === 'string' && model.trim() ? model : DEFAULTS.model,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

/** Returns false if the browser refused to store the settings. */
export function saveSettings(settings: Settings, storage: Storage | null = browserStorage()): boolean {
  try {
    if (!storage) return false
    const cleaned: Settings = {
      apiKey: settings.apiKey.trim(),
      model: settings.model.trim() || DEFAULT_MODEL,
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
    return true
  } catch {
    return false
  }
}

export function clearSettings(storage: Storage | null = browserStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
