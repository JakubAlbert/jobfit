import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { scoreColor } from '../components/scoreColor'
import {
  FeedbackMessage,
  hintClass,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
  type Feedback,
} from '../components/ui'
import { db, PROFILE_ID } from '../db/db'
import type { JobPosting, Profile } from '../db/schema'
import { computeMatch } from '../lib/matchScore'
import { PostingDetail } from './PostingDetail'

type View = { name: 'list' } | { name: 'new' } | { name: 'detail'; id: string }

async function loadData() {
  const [postings, profile] = await Promise.all([
    db.postings.orderBy('createdAt').reverse().toArray(),
    db.profiles.get(PROFILE_ID),
  ])
  return { postings, profile: profile ?? null }
}

export function PostingsPage(props: { onOpenProfile: () => void; onOpenSettings: () => void }) {
  const [view, setView] = useState<View>({ name: 'list' })
  const [postings, setPostings] = useState<JobPosting[] | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const reload = useCallback(
    () =>
      loadData().then((data) => {
        setPostings(data.postings)
        setProfile(data.profile)
      }),
    [],
  )

  useEffect(() => {
    reload()
  }, [reload])

  if (!postings) return <p className={hintClass}>Načítavam inzeráty…</p>

  if (view.name === 'new') {
    return (
      <NewPostingForm
        onCancel={() => setView({ name: 'list' })}
        onSaved={async (id) => {
          await reload()
          setView({ name: 'detail', id })
        }}
      />
    )
  }

  if (view.name === 'detail') {
    const posting = postings.find((item) => item.id === view.id)
    if (posting) {
      return (
        <PostingDetail
          key={posting.id}
          posting={posting}
          profile={profile}
          onBack={() => setView({ name: 'list' })}
          onChanged={reload}
          onOpenProfile={props.onOpenProfile}
          onOpenSettings={props.onOpenSettings}
        />
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Inzeráty</h1>
        <button type="button" onClick={() => setView({ name: 'new' })} className={primaryButton}>
          Pridať inzerát
        </button>
      </div>

      {postings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <p className="font-medium">Zatiaľ tu nie je žiadny inzerát.</p>
          <p className={`${hintClass} mt-1`}>
            Skopíruj text inzerátu z pracovného portálu a vlož ho sem. Aplikácia z neho vytiahne požiadavky a
            porovná ich s tvojím CV.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {postings.map((posting) => {
            const score =
              profile && posting.requirements ? computeMatch(profile.cv.skills, posting.requirements).score : undefined
            return (
              <li key={posting.id}>
                <button
                  type="button"
                  onClick={() => setView({ name: 'detail', id: posting.id })}
                  className="flex w-full items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  <span>
                    <span className="block font-medium">{posting.title || 'Inzerát bez názvu'}</span>
                    <span className={hintClass}>
                      {posting.company || 'Firma neuvedená'} · {new Date(posting.createdAt).toLocaleDateString('sk')}
                    </span>
                  </span>
                  <span className={`shrink-0 text-xl font-bold ${scoreColor(score ?? null)}`}>
                    {score === undefined ? (
                      <span className="text-sm font-normal text-slate-500">
                        {posting.requirements ? 'bez profilu' : 'neanalyzovaný'}
                      </span>
                    ) : score === null ? (
                      '–'
                    ) : (
                      `${score} %`
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function NewPostingForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const posting: JobPosting = {
      id: crypto.randomUUID(),
      title: title.trim(),
      company: company.trim(),
      url: url.trim(),
      text: text.trim(),
      requirements: null,
      createdAt: new Date().toISOString(),
    }
    try {
      await db.postings.add(posting)
      onSaved(posting.id)
    } catch {
      setFeedback({ tone: 'error', text: 'Inzerát sa nepodarilo uložiť.' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-2xl font-bold">Nový inzerát</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="posting-title" label="Pozícia" value={title} onChange={setTitle} />
        <Field id="posting-company" label="Firma" value={company} onChange={setCompany} />
      </div>
      <Field id="posting-url" label="URL inzerátu (voliteľné)" value={url} onChange={setUrl} type="url" />
      <div>
        <label htmlFor="posting-text" className={labelClass}>
          Text inzerátu
        </label>
        <textarea
          id="posting-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          required
          placeholder="Sem vlož celý text inzerátu…"
          className={`${inputClass} mt-1`}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!text.trim()} className={primaryButton}>
          Uložiť inzerát
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
