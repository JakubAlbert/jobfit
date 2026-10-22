import { useState, type FormEvent } from 'react'
import {
  FeedbackMessage,
  inputClass,
  labelClass,
  PageHeader,
  primaryButton,
  secondaryButton,
  type Feedback,
} from '../components/ui'

export interface PostingFields {
  title: string
  company: string
  url: string
  text: string
}

const EMPTY: PostingFields = { title: '', company: '', url: '', text: '' }

interface PostingFormProps {
  heading: string
  lead: string
  submitLabel: string
  initial?: PostingFields
  /** Receives trimmed values; throwing shows an error under the form. */
  onSubmit: (fields: PostingFields) => Promise<void>
  onCancel: () => void
}

/** Shared by "new posting" and "edit posting", so both always ask for the same things. */
export function PostingForm({ heading, lead, submitLabel, initial = EMPTY, onSubmit, onCancel }: PostingFormProps) {
  const [fields, setFields] = useState(initial)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const set = (key: keyof PostingFields) => (value: string) => setFields({ ...fields, [key]: value })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await onSubmit({
        title: fields.title.trim(),
        company: fields.company.trim(),
        url: fields.url.trim(),
        text: fields.text.trim(),
      })
    } catch {
      setFeedback({ tone: 'error', text: 'Inzerát sa nepodarilo uložiť.' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PageHeader title={heading} lead={lead} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="posting-title" label="Pozícia" value={fields.title} onChange={set('title')} />
        <Field id="posting-company" label="Firma" value={fields.company} onChange={set('company')} />
      </div>
      <Field id="posting-url" label="URL inzerátu (voliteľné)" value={fields.url} onChange={set('url')} type="url" />
      <div>
        <label htmlFor="posting-text" className={labelClass}>
          Text inzerátu
        </label>
        <textarea
          id="posting-text"
          value={fields.text}
          onChange={(e) => set('text')(e.target.value)}
          rows={14}
          required
          placeholder="Sem vlož celý text inzerátu…"
          className={`${inputClass} mt-1`}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!fields.text.trim()} className={primaryButton}>
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Zrušiť
        </button>
      </div>
      <FeedbackMessage feedback={feedback} />
    </form>
  )
}

function Field(props: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label htmlFor={props.id} className={labelClass}>
        {props.label}
      </label>
      <input
        id={props.id}
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className={`${inputClass} mt-1`}
      />
    </div>
  )
}
