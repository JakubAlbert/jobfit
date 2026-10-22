import { useEffect, useState } from 'react'
import { formatDate, STATUS_LABELS } from '../components/statusLabels'
import { hintClass, secondaryButton, Section } from '../components/ui'
import { db, PROFILE_ID } from '../db/db'
import type { Application } from '../db/schema'
import { addDays, computeStats, dueFollowUps, FOLLOW_UP_DAYS, todayIso } from '../lib/applications'
import { loadSettings } from '../lib/settings'

type Target = 'applications' | 'postings' | 'profile' | 'settings'

async function loadData() {
  const [applications, profile, postingCount] = await Promise.all([
    db.applications.toArray(),
    db.profiles.get(PROFILE_ID),
    db.postings.count(),
  ])
  return { applications, hasProfile: Boolean(profile), postingCount }
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

  async function updateFollowUp(app: Application, followUpDate: string | null) {
    await db.applications.put({ ...app, followUpDate, updatedAt: new Date().toISOString() })
    setData(await loadData())
  }

  // Short checklist until the basics are set up.
  const steps = [
    { done: hasApiKey, text: 'Zadaj Gemini API kľúč', target: 'settings' as const },
    { done: data.hasProfile, text: 'Nahraj svoje CV', target: 'profile' as const },
    { done: data.postingCount > 0, text: 'Vlož prvý inzerát', target: 'postings' as const },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Prehľad</h1>

      {steps.some((step) => !step.done) && (
        <Section title="Začíname">
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li key={step.text} className="flex items-center gap-2 text-sm">
                <span aria-hidden className={step.done ? 'text-green-700 dark:text-green-400' : 'text-slate-400'}>
                  {step.done ? '✓' : `${index + 1}.`}
                </span>
                {step.done ? (
                  <span className="text-slate-500 line-through">{step.text}</span>
                ) : (
                  <button type="button" onClick={() => onNavigate(step.target)} className="underline">
                    {step.text}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section title="Čas na follow-up">
        {followUps.length === 0 ? (
          <p className={hintClass}>
            Teraz sa netreba nikomu ozývať. Keď žiadosť označíš ako poslanú, appka ti o {FOLLOW_UP_DAYS} dní
            pripomenie, že je čas ozvať sa firme.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {followUps.map((app) => (
              <li key={app.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <button type="button" onClick={() => onNavigate('applications', app.id)} className="text-left">
                  <span className="block font-medium hover:underline">
                    {app.company} – {app.position}
                  </span>
                  <span className={hintClass}>
                    {STATUS_LABELS[app.status]} · follow-up {formatDate(app.followUpDate)}
                  </span>
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => updateFollowUp(app, null)} className={secondaryButton}>
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

      <section aria-label="Štatistiky" className="grid gap-3 sm:grid-cols-3">
        <Stat label="Žiadosti" value={String(stats.total)} detail={`${stats.sent} poslaných`} />
        <Stat
          label="Miera odpovede"
          value={stats.responseRate === null ? '–' : `${stats.responseRate} %`}
          detail={stats.sent === 0 ? 'zatiaľ nič poslané' : `${stats.responded} z ${stats.sent} poslaných`}
        />
        <Stat
          label="Priemerný čas do odpovede"
          value={stats.averageDaysToResponse === null ? '–' : `${stats.averageDaysToResponse.toLocaleString('sk')} d`}
          detail="od odoslania po odpoveď"
        />
      </section>

      {data.applications.length > 0 && (
        <button type="button" onClick={() => onNavigate('applications')} className={secondaryButton}>
          Všetky žiadosti
        </button>
      )}
    </div>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <p className={hintClass}>{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  )
}
