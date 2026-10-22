import { useState } from 'react'
import { SENIORITIES, WORK_MODES, type JobRequirements, type Seniority, type WorkMode } from '../db/schema'
import { SENIORITY_LABELS, WORK_MODE_LABELS } from './statusLabels'
import { TagListEditor } from './TagListEditor'
import { inputClass, labelClass } from './ui'

interface RequirementsEditorProps {
  value: JobRequirements
  onChange: (value: JobRequirements) => void
}

/** Manual corrections to what AI extracted from a posting. Every change is saved right away. */
export function RequirementsEditor({ value, onChange }: RequirementsEditorProps) {
  const set = <K extends keyof JobRequirements>(key: K, field: JobRequirements[K]) => onChange({ ...value, [key]: field })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="req-seniority" className={labelClass}>
            Seniorita
          </label>
          <select
            id="req-seniority"
            value={value.seniority}
            onChange={(e) => set('seniority', e.target.value as Seniority)}
            className={`${inputClass} mt-1`}
          >
            {SENIORITIES.map((level) => (
              <option key={level} value={level}>
                {SENIORITY_LABELS[level]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="req-work-mode" className={labelClass}>
            Spôsob práce
          </label>
          <select
            id="req-work-mode"
            value={value.workMode}
            onChange={(e) => set('workMode', e.target.value as WorkMode)}
            className={`${inputClass} mt-1`}
          >
            {WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {WORK_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </div>
        <TextField
          id="req-location"
          label="Lokalita"
          placeholder="napr. Bratislava"
          value={value.location}
          onCommit={(location) => set('location', location)}
        />
        <TextField
          id="req-salary"
          label="Plat"
          placeholder="napr. 2 500 – 3 200 € brutto"
          value={value.salary}
          onCommit={(salary) => set('salary', salary)}
        />
      </div>

      <TagListEditor
        label="Povinné zručnosti"
        placeholder="napr. React"
        items={value.mustHaveSkills}
        onChange={(mustHaveSkills) => set('mustHaveSkills', mustHaveSkills)}
      />
      <TagListEditor
        label="Výhodou"
        placeholder="napr. Docker"
        items={value.niceToHaveSkills}
        onChange={(niceToHaveSkills) => set('niceToHaveSkills', niceToHaveSkills)}
      />
    </div>
  )
}

/** Saves when the field is left, not on every keystroke. An empty field means "not stated" (null). */
function TextField(props: {
  id: string
  label: string
  placeholder: string
  value: string | null
  onCommit: (value: string | null) => void
}) {
  const [draft, setDraft] = useState(props.value ?? '')

  function commit() {
    const next = draft.trim() || null
    if (next !== props.value) props.onCommit(next)
  }

  return (
    <div>
      <label htmlFor={props.id} className={labelClass}>
        {props.label}
      </label>
      <input
        id={props.id}
        value={draft}
        placeholder={props.placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className={`${inputClass} mt-1`}
      />
    </div>
  )
}
