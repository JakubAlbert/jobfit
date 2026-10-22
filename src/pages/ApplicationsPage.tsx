import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApplicationTable } from '../components/ApplicationTable'
import { KanbanBoard } from '../components/KanbanBoard'
import { EmptyState, hintClass, PageHeader, primaryButton } from '../components/ui'
import { db, PROFILE_ID } from '../db/db'
import type { Application, ApplicationStatus, JobPosting, Profile } from '../db/schema'
import { changeStatus, newApplication, todayIso } from '../lib/applications'
import { computeMatch } from '../lib/matchScore'
import { ApplicationEditor } from './ApplicationEditor'

type Layout = 'kanban' | 'table'
const LAYOUT_KEY = 'jobfit.applicationsLayout'

// The chosen layout is a per-browser convenience; storage may be unavailable, so it is guarded.
function loadLayout(): Layout {
  try {
    return localStorage.getItem(LAYOUT_KEY) === 'table' ? 'table' : 'kanban'
  } catch {
    return 'kanban'
  }
}

function saveLayout(layout: Layout) {
  try {
    localStorage.setItem(LAYOUT_KEY, layout)
  } catch {
    // Not remembered; the default is fine.
  }
}

async function loadData() {
  const [applications, postings, profile] = await Promise.all([
    db.applications.toArray(),
    db.postings.toArray(),
    db.profiles.get(PROFILE_ID),
  ])
  return { applications, postings, profile: profile ?? null }
}

interface ApplicationsPageProps {
  /** Open this application right away (e.g. coming from a posting or the overview). */
  initialId?: string
  onOpenPosting: (id: string) => void
}

export function ApplicationsPage({ initialId, onOpenPosting }: ApplicationsPageProps) {
  const [data, setData] = useState<{ applications: Application[]; postings: JobPosting[]; profile: Profile | null } | null>(
    null,
  )
  const [layout, setLayout] = useState<Layout>(loadLayout)
  const [editing, setEditing] = useState<{ application: Application; isNew: boolean } | null>(null)
  const today = todayIso()

  const reload = useCallback(() => loadData().then(setData), [])

  useEffect(() => {
    loadData().then((loaded) => {
      setData(loaded)
      const initial = initialId && loaded.applications.find((app) => app.id === initialId)
      if (initial) setEditing({ application: initial, isNew: false })
    })
  }, [initialId])

  // Live score per application, from its linked posting and the current profile.
  const scores = useMemo(() => {
    const result = new Map<string, number | null>()
    if (!data?.profile) return result
    for (const app of data.applications) {
      const posting = data.postings.find((item) => item.id === app.postingId)
      if (posting?.requirements) result.set(app.id, computeMatch(data.profile.cv.skills, posting.requirements).score)
    }
    return result
  }, [data])

  if (!data) return <p className={hintClass}>Načítavam žiadosti…</p>

  async function save(application: Application) {
    await db.applications.put({ ...application, updatedAt: new Date().toISOString() })
    await reload()
  }

  async function handleMove(application: Application, status: ApplicationStatus) {
    await save(changeStatus(application, status, today))
  }

  if (editing) {
    const close = () => setEditing(null)
    return (
      <ApplicationEditor
        key={editing.application.id}
        application={editing.application}
        isNew={editing.isNew}
        posting={data.postings.find((posting) => posting.id === editing.application.postingId) ?? null}
        onSave={async (application) => {
          await save(application)
          close()
        }}
        onDelete={async () => {
          await db.applications.delete(editing.application.id)
          await reload()
          close()
        }}
        onClose={close}
        onOpenPosting={onOpenPosting}
      />
    )
  }

  const switchLayout = (next: Layout) => {
    setLayout(next)
    saveLayout(next)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Žiadosti"
        lead="Posúvaj žiadosti medzi stavmi ťahaním alebo cez výber na karte."
        actions={
          <>
          <div role="group" aria-label="Zobrazenie" className="flex rounded-xl bg-sunken p-1">
            {(['kanban', 'table'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => switchLayout(option)}
                aria-pressed={layout === option}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink aria-pressed:bg-surface aria-pressed:text-accent aria-pressed:shadow-sm"
              >
                {option === 'kanban' ? 'Kanban' : 'Tabuľka'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setEditing({ application: newApplication({ company: '', position: '' }), isNew: true })}
            className={primaryButton}
          >
            Pridať žiadosť
          </button>
          </>
        }
      />

      {data.applications.length === 0 ? (
        <EmptyState title="Zatiaľ nesleduješ žiadnu žiadosť">
          Vytvor ju z detailu analyzovaného inzerátu alebo ručne tlačidlom „Pridať žiadosť“. Potom ju posúvaj
          medzi stavmi a appka ti pripomenie, kedy sa firme ozvať.
        </EmptyState>
      ) : layout === 'kanban' ? (
        <KanbanBoard
          applications={data.applications}
          scores={scores}
          today={today}
          onMove={handleMove}
          onOpen={(application) => setEditing({ application, isNew: false })}
        />
      ) : (
        <ApplicationTable
          applications={data.applications}
          scores={scores}
          onOpen={(application) => setEditing({ application, isNew: false })}
        />
      )}
    </div>
  )
}
