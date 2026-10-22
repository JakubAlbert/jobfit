import { useCallback, useEffect, useState } from 'react'
import { scoreChip } from '../components/scoreColor'
import { EmptyState, hintClass, PageHeader, primaryButton } from '../components/ui'
import { db, PROFILE_ID } from '../db/db'
import type { JobPosting, Profile } from '../db/schema'
import { computeMatch } from '../lib/matchScore'
import { notifyOnboardingProgress } from '../lib/onboarding'
import { fillSeniorityFromTitle } from '../lib/seniority'
import { PostingDetail } from './PostingDetail'
import { PostingForm, type PostingFields } from './PostingForm'

type View = { name: 'list' } | { name: 'new' } | { name: 'detail'; id: string }

async function loadData() {
  const [postings, profile] = await Promise.all([
    db.postings.orderBy('createdAt').reverse().toArray(),
    db.profiles.get(PROFILE_ID),
  ])
  // One-off repair of postings analysed before the title was used for seniority.
  const repaired = postings.map(fillSeniorityFromTitle).filter((posting) => posting !== null)
  if (repaired.length > 0) await db.postings.bulkPut(repaired)
  const fixed = postings.map((posting) => repaired.find((r) => r.id === posting.id) ?? posting)
  return { postings: fixed, profile: profile ?? null }
}

interface PostingsPageProps {
  /** Open this posting right away (e.g. coming from an application). */
  initialId?: string
  onOpenProfile: () => void
  onOpenSettings: () => void
  onOpenApplication: (id: string) => void
}

export function PostingsPage(props: PostingsPageProps) {
  const [view, setView] = useState<View>(props.initialId ? { name: 'detail', id: props.initialId } : { name: 'list' })
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
          onOpenApplication={props.onOpenApplication}
        />
      )
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inzeráty"
        lead="Vložené inzeráty a to, ako k nim sedí tvoje CV."
        actions={
          <button type="button" onClick={() => setView({ name: 'new' })} className={primaryButton}>
            Pridať inzerát
          </button>
        }
      />

      {postings.length === 0 ? (
        <EmptyState title="Zatiaľ tu nie je žiadny inzerát">
          Skopíruj text inzerátu z pracovného portálu a vlož ho sem. Aplikácia z neho vytiahne požiadavky a
          porovná ich s tvojím CV.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {postings.map((posting) => {
            const score =
              profile && posting.requirements ? computeMatch(profile.cv.skills, posting.requirements).score : undefined
            return (
              <li key={posting.id}>
                <button
                  type="button"
                  onClick={() => setView({ name: 'detail', id: posting.id })}
                  className="flex h-full w-full items-center gap-4 rounded-2xl bg-surface p-4 text-left ring-1 ring-line transition hover:ring-accent/40"
                >
                  {/* The score tile carries the score colour, so the list can be scanned by fit. */}
                  <span
                    className={`grid size-16 shrink-0 place-items-center rounded-2xl font-display text-xl font-bold ${scoreChip(score ?? null)}`}
                  >
                    {score === undefined ? (
                      <span className="px-1 text-center font-sans text-[11px] leading-tight font-semibold">
                        {posting.requirements ? 'bez profilu' : 'neanalyzovaný'}
                      </span>
                    ) : score === null ? (
                      '–'
                    ) : (
                      `${score} %`
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-lg leading-snug font-semibold">
                      {posting.title || 'Inzerát bez názvu'}
                    </span>
                    <span className="block text-sm text-muted">{posting.company || 'Firma neuvedená'}</span>
                    <span className="block text-xs text-muted">
                      Pridané {new Date(posting.createdAt).toLocaleDateString('sk')}
                    </span>
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
  async function handleSubmit(fields: PostingFields) {
    const posting: JobPosting = { id: crypto.randomUUID(), ...fields, requirements: null, createdAt: new Date().toISOString() }
    await db.postings.add(posting)
    notifyOnboardingProgress()
    onSaved(posting.id)
  }

  return (
    <PostingForm
      heading="Nový inzerát"
      lead="Vlož celý text inzerátu. Pozícia, firma a odkaz pomôžu inzerát neskôr nájsť."
      submitLabel="Uložiť inzerát"
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  )
}
