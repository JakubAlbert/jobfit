import { useState, type ComponentType, type SVGProps } from 'react'
import { applyTheme, loadTheme, saveTheme, type Theme } from '../lib/theme'
import { MoonIcon, SunIcon, SystemIcon } from './icons'

const OPTIONS: { value: Theme; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { value: 'system', label: 'Podľa systému', icon: SystemIcon },
  { value: 'light', label: 'Svetlý režim', icon: SunIcon },
  { value: 'dark', label: 'Tmavý režim', icon: MoonIcon },
]

/** Three-way switch: all options visible at once, so it is clear what "system" means next to the others. */
export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(loadTheme)

  function choose(next: Theme) {
    setTheme(next)
    saveTheme(next)
    applyTheme(next)
  }

  return (
    <div role="radiogroup" aria-label="Vzhľad" className="flex rounded-full bg-sunken p-1">
      {OPTIONS.map(({ value, label, icon: OptionIcon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:text-ink aria-checked:bg-surface aria-checked:text-accent aria-checked:shadow-sm"
        >
          <OptionIcon width={17} height={17} />
        </button>
      ))}
    </div>
  )
}
