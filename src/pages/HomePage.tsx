import { useEffect, useState } from 'react'
import { formatDate, STATUS_BADGE, STATUS_BAR, STATUS_LABELS } from '../components/statusLabels'
import { EmptyState, hintClass, linkClass, PageHeader, primaryButton, secondaryButton, Section } from '../components/ui'
import { DEMO_PROFILE_TEXT, loadDemoData } from '../data/demoData'
import { db, PROFILE_ID } from '../db/db'
import { APPLICATION_STATUSES, type Application } from '../db/schema'
import { ACTIVE_STATUSES, addDays, computeStats, dueFollowUps, FOLLOW_UP_DAYS, todayIso } from '../lib/applications'
import { onboardingSteps } from '../lib/onboarding'
import { loadSettings } from '../lib/settings'

type Target = 'applications' | 'postings' | 'profile' | 'settings'

async function loadData() {
  const [applications, profile, postingCount] = await Promise.all([
    db.applications.toArray(),
    db.profiles.get(PROFILE_ID),
    db.postings.count(),
  ])
  return { applications, hasProfile: Boolean(profile), isDemo: profile?.rawText === DEMO_PROFILE_TEXT, postingCount }
}

export function HomePage({ onNavigate }: { onNavigate: (page: Target, id?: string) => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadData>> | null>(null)
  const today = todayIso()

  useEffect(() => {
    loadData().then(setData)
  }, [])

  if (!data) return <p className={hintClass}>Načítavam…</p>

  const followUps = dueFollowUps(data.applications, today)
  const stats = computeStats(data.applications)
  const hasApiKey = Boolean(loadSettings().apiKey)
  const waiting = data.applications.filter((app) => ACTIVE_STATUSES.includes(app.status)).length

  async function updateFollowUp(app: Application, followUpDate: string | null) {
    await db.applications.put({ ...app, followUpDate, updatedAt: new Date().toISOString() })
    setData(await loadData())
  }

  async function handleDemo() {
    await loadDemoData()
    setData(await loadData())
  }

  const steps = onboardingSteps({ hasApiKey, hasProfile: data.hasProfile, postingCount: data.postingCount })
  const isEmpty = !data.hasProfile && data.postingCount === 0 && data.applications.length === 0

  return (
    <div className="space-y-6">
      <PageHeader title="Prehľad" lead={summary(followUps.length, waiting, data.applications.length)} />

      {data.isDemo && (
        <p className="rounded-2xl bg-applied px-4 py-3 text-sm text-applied-ink">
          Prezeráš ukážkové dáta s vymyslenou osobou. Keď budeš chcieť začať naostro, vymaž ich v{' '}
          <button type="button" onClick={() => onNavigate('settings')} className="font-semibold underline">
            Nastaveniach
          </button>
          .
        </p>
      )}

      {steps.some((step) => !step.done) && (
        <section className="grid gap-6 rounded-3xl bg-accent-soft p-6 text-interview-ink sm:p-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="text-2xl font-bold">Vitaj v JobFit</h2>
            <p className="mt-3 max-w-prose">
              Porovná tvoje CV s pracovným inzerátom, ukáže zhodu a chýbajúce zručnosti a pomôže ti sledovať
              žiadosti. Všetky dáta zostávajú v tvojom prehliadači a CV sa pred odoslaním do AI anonymizuje.
            </p>
            {isEmpty && (
              <div className="mt-5">
                <button type="button" onClick={handleDemo} className={primaryButton}>
                  Vyskúšať s ukážkovými dátami
                </button>
                <p className="mt-2 text-sm opacity-80">Bez API kľúča a vlastného CV.</p>
              </div>
            )}
          </div>
          {/* A real sequence, so numbered steps. */}
          <ol className="space-y-2 self-center">
            {steps.map((step, index) => (
              <li key={step.text}>
                <button
                  type="button"
                  onClick={() => onNavigate(step.target)}
                  disabled={step.done}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface/70 px-4 py-3 text-left font-semibold transition-colors enabled:hover:bg-surface disabled:opacity-60"
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full text-sm ${
                      step.done ? 'bg-offer text-offer-ink' : 'bg-accent text-on-accent'
                    }`}
                  >
                    {step.done ? '✓' : index + 1}
                  </span>
                  <span className={step.done ? 'line-through' : ''}>{step.text}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {data.applications.length > 0 && <Pipeline applications={data.applications} onOpen={() => onNavigate('applications')} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Section title="Čas na follow-up">
          {followUps.length === 0 ? (
            <EmptyState title="Teraz sa netreba nikomu ozývať">
              Keď žiadosť označíš ako poslanú, appka ti o {FOLLOW_UP_DAYS} dní pripomenie, že je čas ozvať sa firme.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {followUps.map((app) => (
                <li key={app.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-peach/60 p-4">
                  <button type="button" onClick={() => onNavigate('applications', app.id)} className="text-left">
                    <span className="block font-semibold hover:underline">
                      {app.company}, {app.position}
                    </span>
                    <span className="text-sm text-peach-ink">
                      {STATUS_LABELS[app.status]}, follow-up {formatDate(app.followUpDate)}
                    </span>
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateFollowUp(app, null)} className={primaryButton}>
                      Hotovo
                    </button>
                    <button
                      type="button"
                      onClick={() => updateFollowUp(app, addDays(today, FOLLOW_UP_DAYS))}
                      className={secondaryButton}
                    >
                      Odložiť o týždeň
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <section aria-label="Štatistiky" className="rounded-3xl bg-surface p-5 ring-1 ring-line sm:p-7">
          <dl className="space-y-6">
            <Stat
              label="Miera odpovede"
              value={stats.responseRate === null ? '–' : `${stats.responseRate} %`}
              detail={stats.sent === 0 ? 'Zatiaľ nič poslané.' : `Odpovedalo ${stats.responded} z ${stats.sent} firiem.`}
            />
            <Stat
              label="Priemerný čas do odpovede"
              value={
                stats.averageDaysToResponse === null ? '–' : `${stats.averageDaysToResponse.toLocaleString('sk')} dní`
              }
              detail="Od odoslania po prvú odpoveď."
            />
            <Stat label="Žiadosti spolu" value={String(stats.total)} detail={`${stats.sent} z nich poslaných.`} />
          </dl>
          {data.applications.length > 0 && (
            <button type="button" onClick={() => onNavigate('applications')} className={`${linkClass} mt-6 text-sm`}>
              Otvoriť všetky žiadosti
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

/** One sentence about what needs attention, instead of a generic greeting. */
function summary(due: number, waiting: number, total: number): string {
  if (total === 0) return 'Zatiaľ tu nie sú žiadne žiadosti. Začni profilom a prvým inzerátom.'
  const dueText =
    due === 0 ? 'Dnes netreba nikoho urgovať' : due === 1 ? 'Dnes sa treba ozvať 1 firme' : `Dnes sa treba ozvať ${due} firmám`
  return `${dueText}. Na ďalší krok čaká ${waiting} z ${total} žiadostí.`
}

/** Where all applications stand, in the status colours used everywhere else. */
function Pipeline({ applications, onOpen }: { applications: Application[]; onOpen: () => void }) {
  const counts = APPLICATION_STATUSES.map((status) => ({
    status,
    count: applications.filter((app) => app.status === status).length,
  }))
  return (
    <section aria-label="Stav žiadostí">
      <button type="button" onClick={onOpen} className="block w-full rounded-full" aria-label="Otvoriť žiadosti">
        <span className="flex h-3 gap-1 overflow-hidden rounded-full">
          {counts
            .filter(({ count }) => count > 0)
            .map(({ status, count }) => (
              <span key={status} style={{ flexGrow: count }} className={`basis-0 ${STATUS_BAR[status]}`} />
            ))}
        </span>
      </button>
      <ul className="mt-3 flex flex-wrap gap-2">
        {counts.map(({ status, count }) => (
          <li
            key={status}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${count === 0 ? 'bg-sunken text-muted' : STATUS_BADGE[status]}`}
          >
            {STATUS_LABELS[status]} {count}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="font-display text-4xl font-bold tracking-tight">{value}</dd>
      <dd className="text-sm text-muted">{detail}</dd>
    </div>
  )
}
