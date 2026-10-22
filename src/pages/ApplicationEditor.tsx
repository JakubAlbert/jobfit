import { useState, type FormEvent } from 'react'
import { formatDate, STATUS_BADGE, STATUS_LABELS } from '../components/statusLabels'
import {
  dangerButton,
  FeedbackMessage,
  hintClass,
  linkClass,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
  type Feedback,
} from '../components/ui'
import { APPLICATION_STATUSES, type Application, type ApplicationStatus, type JobPosting } from '../db/schema'
import { changeStatus, todayIso } from '../lib/applications'
import { applicationEvents, buildIcs, downloadIcs } from '../lib/calendar'

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
  const calendarEvents = applicationEvents(draft)

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
        <button type="button" onClick={onClose} className={`${linkClass} text-sm`}>
          Späť na žiadosti
        </button>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          {isNew ? 'Nová žiadosť' : draft.company || 'Žiadosť'}
        </h1>
        {posting && (
          <p className={hintClass}>
            Prepojený inzerát:{' '}
            <button type="button" onClick={() => onOpenPosting(posting.id)} className={linkClass}>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DateField id="app-applied" label="Poslané" value={draft.appliedDate} onChange={(v) => set('appliedDate', v)} />
        <DateField id="app-response" label="Odpoveď" value={draft.responseDate} onChange={(v) => set('responseDate', v)} />
        <DateField id="app-follow-up" label="Follow-up" value={draft.followUpDate} onChange={(v) => set('followUpDate', v)} />
        <div>
          <label htmlFor="app-interview" className={labelClass}>
            Pohovor
          </label>
          <input
            id="app-interview"
            type="datetime-local"
            value={draft.interviewAt ?? ''}
            onChange={(e) => set('interviewAt', e.target.value || null)}
            className={`${inputClass} mt-1`}
          />
        </div>
      </div>
      <p className={hintClass}>
        Pri zmene stavu sa prázdne dátumy vyplnia samé: po odoslaní dátum odoslania a follow-up o 7 dní, pri
        odpovedi firmy dátum odpovede.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => downloadIcs(`jobfit-${slug(draft.company) || 'ziadost'}.ics`, buildIcs(calendarEvents))}
          disabled={calendarEvents.length === 0}
          className={secondaryButton}
        >
          Pridať do kalendára
        </button>
        <span className={hintClass}>
          {calendarEvents.length === 0
            ? 'Vyplň follow-up alebo termín pohovoru.'
            : 'Stiahne súbor .ics s follow-upom a pohovorom pre Google, Outlook či Apple kalendár.'}
        </span>
      </div>

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

      {draft.history.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">História</h2>
          {/* A timeline: each status the application went through, with the day it happened. */}
          <ol className="relative space-y-3 border-l-2 border-line pl-5">
            {draft.history.map((change, index) => (
              <li key={`${change.status}-${change.date}-${index}`} className="relative">
                <span className="absolute top-1.5 -left-[27px] size-3 rounded-full bg-accent ring-4 ring-paper" />
                <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${STATUS_BADGE[change.status]}`}>
                  {STATUS_LABELS[change.status]}
                </span>
                <span className="ml-2 text-sm text-muted">{formatDate(change.date)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

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

/** File-name friendly version of a company name: "Ukážka Tech s.r.o." → "ukazka-tech-s-r-o". */
function slug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
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
