import { useId } from 'react'
import type { CvData } from '../db/schema'
import { TagListEditor } from './TagListEditor'
import { hintClass, inputClass, labelClass, secondaryButton } from './ui'

interface CvEditorProps {
  value: CvData
  onChange: (value: CvData) => void
}

/** Editable form for the structured CV. Fully controlled: every change goes through onChange. */
export function CvEditor({ value, onChange }: CvEditorProps) {
  const set = <K extends keyof CvData>(key: K) => (items: CvData[K]) => onChange({ ...value, [key]: items })

  return (
    <div className="space-y-8">
      <TagListEditor label="Zručnosti" placeholder="napr. React, SQL" items={value.skills} onChange={set('skills')} />
      <EntryListEditor
        label="Skúsenosti"
        items={value.experience}
        onChange={set('experience')}
        empty={{ position: '', company: '', period: '', description: '' }}
        fields={[
          { key: 'position', label: 'Pozícia' },
          { key: 'company', label: 'Firma' },
          { key: 'period', label: 'Obdobie' },
          { key: 'description', label: 'Popis', multiline: true },
        ]}
      />
      <EntryListEditor
        label="Vzdelanie"
        items={value.education}
        onChange={set('education')}
        empty={{ institution: '', degree: '', period: '' }}
        fields={[
          { key: 'institution', label: 'Škola' },
          { key: 'degree', label: 'Odbor / titul' },
          { key: 'period', label: 'Obdobie' },
        ]}
      />
      <EntryListEditor
        label="Jazyky"
        items={value.languages}
        onChange={set('languages')}
        empty={{ language: '', level: '' }}
        fields={[
          { key: 'language', label: 'Jazyk' },
          { key: 'level', label: 'Úroveň' },
        ]}
      />
      <TagListEditor
        label="Certifikáty"
        placeholder="napr. AWS Cloud Practitioner"
        items={value.certificates}
        onChange={set('certificates')}
      />
    </div>
  )
}

interface Field<T> {
  key: keyof T & string
  label: string
  multiline?: boolean
}

function EntryListEditor<T extends Record<string, string>>(props: {
  label: string
  items: T[]
  empty: T
  fields: Field<T>[]
  onChange: (items: T[]) => void
}) {
  const { label, items, empty, fields, onChange } = props
  const baseId = useId()

  const update = (index: number, key: keyof T, text: string) =>
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: text } : item)))

  return (
    <fieldset>
      <legend className="mb-2 text-base font-semibold">{label}</legend>
      {items.length === 0 && <p className={`${hintClass} mb-2`}>Zatiaľ nič.</p>}
      <div className="space-y-3">
        {items.map((item, index) => (
          // Entries have no stable id; index keys are fine because items are only appended or removed.
          <div key={index} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => {
                const id = `${baseId}-${index}-${field.key}`
                return (
                  <div key={field.key} className={field.multiline ? 'sm:col-span-2' : undefined}>
                    <label htmlFor={id} className={labelClass}>
                      {field.label}
                    </label>
                    {field.multiline ? (
                      <textarea
                        id={id}
                        value={item[field.key]}
                        onChange={(e) => update(index, field.key, e.target.value)}
                        rows={3}
                        className={`${inputClass} mt-1`}
                      />
                    ) : (
                      <input
                        id={id}
                        value={item[field.key]}
                        onChange={(e) => update(index, field.key, e.target.value)}
                        className={`${inputClass} mt-1`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="mt-3 text-sm text-red-700 hover:underline dark:text-red-400"
            >
              Odstrániť
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...items, { ...empty }])} className={`${secondaryButton} mt-3`}>
        Pridať
      </button>
    </fieldset>
  )
}
