import { useId, useState, type KeyboardEvent } from 'react'
import { addUnique } from '../lib/cv'
import { hintClass, inputClass, secondaryButton } from './ui'

/** Editable list of short items shown as removable chips (skills, certificates). */
export function TagListEditor(props: {
  label: string
  placeholder: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const { label, placeholder, items, onChange } = props
  const [input, setInput] = useState('')
  const inputId = useId()

  function add() {
    onChange(addUnique(items, input))
    setInput('')
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      add()
    }
  }

  return (
    <fieldset>
      <legend className="mb-2 text-base font-semibold">{label}</legend>
      {items.length === 0 && <p className={`${hintClass} mb-2`}>Zatiaľ nič.</p>}
      <ul className="mb-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pr-1 pl-3 text-sm dark:bg-slate-800"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((other) => other !== item))}
              aria-label={`Odstrániť ${item}`}
              className="rounded-full px-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          Pridať: {label}
        </label>
        <input
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className={inputClass}
        />
        <button type="button" onClick={add} disabled={!input.trim()} className={secondaryButton}>
          Pridať
        </button>
      </div>
    </fieldset>
  )
}
