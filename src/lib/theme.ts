// Light / dark theme. "system" follows the operating system setting.
// The choice is a per-browser convenience in localStorage; index.html applies it before the first
// paint (to avoid a flash of the wrong theme) with the same storage key and logic.

export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

export const THEME_STORAGE_KEY = 'jobfit.theme'

export function loadTheme(storage: Storage | null = safeStorage()): Theme {
  try {
    const stored = storage?.getItem(THEME_STORAGE_KEY)
    return THEMES.includes(stored as Theme) ? (stored as Theme) : 'system'
  } catch {
    return 'system'
  }
}

export function saveTheme(theme: Theme, storage: Storage | null = safeStorage()): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Not remembered; the theme still applies for this visit.
  }
}

export function isDark(theme: Theme, systemPrefersDark: boolean): boolean {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark)
}

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

/** Sets the "dark" class Tailwind's dark: variant uses, and color-scheme for native controls. */
export function applyTheme(theme: Theme): void {
  const dark = isDark(theme, darkQuery().matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

/** Re-applies the saved theme when the system setting changes. Returns a function that stops listening. */
export function followSystemTheme(): () => void {
  const query = darkQuery()
  const onChange = () => applyTheme(loadTheme())
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}
