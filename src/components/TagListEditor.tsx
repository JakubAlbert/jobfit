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
            className="flex items-center gap-1 rounded-full bg-accent-soft py-1 pr-1 pl-3 text-sm font-medium text-accent-ink"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((other) => other !== item))}
              aria-label={`Odstrániť ${item}`}
              className="grid size-6 place-items-center rounded-full opacity-60 transition hover:bg-surface hover:opacity-100"
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
