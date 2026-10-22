import { useState, type FormEvent } from 'react'
import { STATUS_LABELS } from '../components/statusLabels'
import {
  dangerButton,
  FeedbackMessage,
  hintClass,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
  type Feedback,
} from '../components/ui'
import { APPLICATION_STATUSES, type Application, type ApplicationStatus, type JobPosting } from '../db/schema'
import { changeStatus, todayIso } from '../lib/applications'

interface ApplicationEditorProps {
  application: Application
  isNew: boolean
  posting: JobPosting | null
  onSave: (application: Application) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
  onOpenPosting: (id: string) => void
}

export function ApplicationEditor(props: ApplicationEditorProps) {
  const { isNew, posting, onSave, onDelete, onClose, onOpenPosting } = props
  const [draft, setDraft] = useState(props.application)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const set = <K extends keyof Application>(key: K, value: Application[K]) => setDraft({ ...draft, [key]: value })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await onSave({ ...draft, company: draft.company.trim(), position: draft.position.trim() })
    } catch {
      setFeedback({ tone: 'error', text: 'Žiadosť sa nepodarilo uložiť.' })
    }
  }

  async function handleDelete() {
    if (window.confirm('Naozaj vymazať túto žiadosť?')) await onDelete()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <button type="button" onClick={onClose} className="text-sm underline">
          ← Späť na žiadosti
        </button>
        <h1 className="mt-2 text-2xl font-bold">{isNew ? 'Nová žiadosť' : 'Žiadosť'}</h1>
        {posting && (
          <p className={hintClass}>
            Prepojený inzerát:{' '}
            <button type="button" onClick={() => onOpenPosting(posting.id)} className="underline">
              {posting.title || 'Inzerát bez názvu'}
            </button>
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="app-company" label="Firma" value={draft.company} onChange={(v) => set('company', v)} required />
        <TextField id="app-position" label="Pozícia" value={draft.position} onChange={(v) => set('position', v)} required />
      </div>

      <div>
        <label htmlFor="app-status" className={labelClass}>
          Stav
        </label>
        <select
          id="app-status"
          value={draft.status}
          // Changing the status here fills in empty dates the same way as moving the card in the kanban.
          onChange={(e) => setDraft(changeStatus(draft, e.target.value as ApplicationStatus, todayIso()))}
          className={`${inputClass} mt-1 sm:w-64`}
        >
          {APPLICATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <DateField id="app-applied" label="Poslané" value={draft.appliedDate} onChange={(v) => set('appliedDate', v)} />
        <DateField id="app-response" label="Odpoveď" value={draft.responseDate} onChange={(v) => set('responseDate', v)} />
        <DateField id="app-follow-up" label="Follow-up" value={draft.followUpDate} onChange={(v) => set('followUpDate', v)} />
      </div>
      <p className={hintClass}>
        Pri zmene stavu sa prázdne dátumy vyplnia samé: po odoslaní dátum odoslania a follow-up o 7 dní, pri
        odpovedi firmy dátum odpovede.
      </p>

      <div>
        <label htmlFor="app-notes" className={labelClass}>
          Poznámky
        </label>
        <textarea
          id="app-notes"
          value={draft.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={5}
          className={`${inputClass} mt-1`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primaryButton}>
          Uložiť
        </button>
        <button type="button" onClick={onClose} className={secondaryButton}>
          Zrušiť
        </button>
        {!isNew && (
          <button type="button" onClick={handleDelete} className={`${dangerButton} sm:ml-auto`}>
            Vymazať
          </button>
        )}
      </div>
      <FeedbackMessage feedback={feedback} />
    </form>
  )
}

function TextField(props: { id: string; label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label htmlFor={props.id} className={labelClass}>
        {props.label}
      </label>
      <input
        id={props.id}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        className={`${inputClass} mt-1`}
      />
    </div>
  )
}

function DateField(props: { id: string; label: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div>
      <label htmlFor={props.id} className={labelClass}>
        {props.label}
      </label>
      <input
        id={props.id}
        type="date"
        value={props.value ?? ''}
        onChange={(e) => props.onChange(e.target.value || null)}
        className={`${inputClass} mt-1`}
      />
    </div>
  )
}
