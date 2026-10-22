import { useEffect, useMemo, useState } from 'react'
import { ScoreCard } from '../components/ScoreCard'
import { TagListEditor } from '../components/TagListEditor'
import {
  dangerButton,
  FeedbackMessage,
  hintClass,
  inputClass,
  primaryButton,
  secondaryButton,
  Section,
  type Feedback,
} from '../components/ui'
import { db, PROFILE_ID } from '../db/db'
import type {
  Analysis,
  CoverLetterLanguage,
  JobPosting,
  JobRequirements,
  Profile,
  Seniority,
  WorkMode,
} from '../db/schema'
import { newApplication } from '../lib/applications'
import { GeminiError } from '../lib/gemini'
import { compareLanguages, computeMatch, type MatchResult } from '../lib/matchScore'
import { analyzePosting, generateCoverLetter, generateInsights } from '../lib/posting'
import { loadSettings } from '../lib/settings'

const SENIORITY_LABELS: Record<Seniority, string> = {
  junior: 'Junior',
  mid: 'Medior',
  senior: 'Senior',
  lead: 'Lead',
  unknown: 'neuvedená',
}

const WORK_MODE_LABELS: Record<WorkMode, string> = {
  onsite: 'v kancelárii',
  hybrid: 'hybridne',
  remote: 'na diaľku',
  unknown: 'neuvedené',
}

interface PostingDetailProps {
  posting: JobPosting
  profile: Profile | null
  onBack: () => void
  onChanged: () => void
  onOpenProfile: () => void
  onOpenSettings: () => void
  onOpenApplication: (id: string) => void
}

export function PostingDetail(props: PostingDetailProps) {
  const { profile, onBack, onChanged, onOpenProfile, onOpenSettings, onOpenApplication } = props
  const [posting, setPosting] = useState(props.posting)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [busy, setBusy] = useState<'posting' | 'insights' | 'letter' | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [droppedRewrites, setDroppedRewrites] = useState(0)
  const [letterLanguage, setLetterLanguage] = useState<CoverLetterLanguage>('sk')
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const hasApiKey = Boolean(loadSettings().apiKey)

  useEffect(() => {
    db.analyses.get(posting.id).then((stored) => setAnalysis(stored ?? null))
    db.applications
      .where('postingId')
      .equals(posting.id)
      .first()
      .then((application) => setApplicationId(application?.id ?? null))
  }, [posting.id])

  // Always computed from the current profile and requirements: free, instant and never stale.
  const match = useMemo(
    () => (profile && posting.requirements ? computeMatch(profile.cv.skills, posting.requirements) : null),
    [profile, posting.requirements],
  )

  const onStatus = (text: string) => setFeedback({ tone: 'info', text })
  const showError = (error: unknown, fallback: string) =>
    setFeedback({ tone: 'error', text: error instanceof GeminiError ? error.message : fallback })

  async function savePosting(changes: Partial<JobPosting>) {
    const updated = { ...posting, ...changes }
    setPosting(updated)
    await db.postings.put(updated)
    onChanged()
  }

  async function handleAnalyzePosting() {
    setBusy('posting')
    setFeedback({ tone: 'info', text: 'Analyzujem inzerát…' })
    try {
      const requirements = await analyzePosting(loadSettings(), posting.text, onStatus)
      await savePosting({ requirements })
      setFeedback(null)
    } catch (error) {
      showError(error, 'Analýza inzerátu zlyhala.')
    } finally {
      setBusy(null)
    }
  }

  async function saveAnalysis(match: MatchResult, changes: Partial<Analysis>) {
    const updated: Analysis = {
      id: posting.id,
      postingId: posting.id,
      profileId: PROFILE_ID,
      insights: null,
      coverLetter: null,
      ...analysis,
      // Snapshot of what the AI was given.
      score: match.score,
      matchedSkills: [...match.matchedMustHave, ...match.matchedNiceToHave],
      missingMustHave: match.missingMustHave,
      missingNiceToHave: match.missingNiceToHave,
      createdAt: new Date().toISOString(),
      ...changes,
    }
    await db.analyses.put(updated)
    setAnalysis(updated)
  }

  async function handleInsights() {
    if (!profile || !posting.requirements || !match) return
    setBusy('insights')
    setFeedback({ tone: 'info', text: 'Pripravujem odporúčania…' })
    try {
      const result = await generateInsights(
        loadSettings(),
        { cv: profile.cv, posting: postingInfo(posting, posting.requirements), match },
        onStatus,
      )
      await saveAnalysis(match, { insights: result.insights })
      setDroppedRewrites(result.droppedRewrites)
      setFeedback(null)
    } catch (error) {
      showError(error, 'Odporúčania sa nepodarilo pripraviť.')
    } finally {
      setBusy(null)
    }
  }

  async function handleCoverLetter() {
    if (!profile || !posting.requirements || !match) return
    setBusy('letter')
    setFeedback({ tone: 'info', text: 'Píšem motivačný list…' })
    try {
      const text = await generateCoverLetter(
        loadSettings(),
        {
          cv: profile.cv,
          posting: postingInfo(posting, posting.requirements),
          language: letterLanguage,
          fullName: profile.fullName,
        },
        onStatus,
      )
      await saveAnalysis(match, { coverLetter: { language: letterLanguage, text } })
      setFeedback(null)
    } catch (error) {
      showError(error, 'Motivačný list sa nepodarilo napísať.')
    } finally {
      setBusy(null)
    }
  }

  async function handleCreateApplication() {
    const application = newApplication({ company: posting.company, position: posting.title, postingId: posting.id })
    await db.applications.add(application)
    onOpenApplication(application.id)
  }

  async function handleDelete() {
    if (!window.confirm('Naozaj vymazať tento inzerát aj jeho analýzu? Žiadosti zostanú, len bez prepojenia.')) return
    await db.transaction('rw', db.postings, db.analyses, db.applications, async () => {
      await db.postings.delete(posting.id)
      await db.analyses.delete(posting.id)
      // Applications are kept; they just lose the link to the deleted posting.
      await db.applications.where('postingId').equals(posting.id).modify({ postingId: null })
    })
    onChanged()
    onBack()
  }

  async function copyLetter(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setFeedback({ tone: 'success', text: 'Motivačný list je skopírovaný.' })
    } catch {
      setFeedback({ tone: 'error', text: 'Kopírovanie zlyhalo. Označ text a skopíruj ho ručne.' })
    }
  }

  const requirements = posting.requirements
  const insightsOutdated = analysis?.insights && match && analysis.score !== match.score

  return (
    <div className="space-y-6">
      <div>
        <button type="button" onClick={onBack} className="text-sm underline">
          ← Späť na inzeráty
        </button>
        <h1 className="mt-2 text-2xl font-bold">{posting.title || 'Inzerát bez názvu'}</h1>
        <p className={hintClass}>
          {posting.company || 'Firma neuvedená'}
          {posting.url && (
            <>
              {' · '}
              <a href={posting.url} target="_blank" rel="noreferrer" className="underline">
                pôvodný inzerát
              </a>
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {applicationId ? (
          <button type="button" onClick={() => onOpenApplication(applicationId)} className={secondaryButton}>
            Otvoriť žiadosť
          </button>
        ) : (
          <button type="button" onClick={handleCreateApplication} className={secondaryButton}>
            Vytvoriť žiadosť
          </button>
        )}
        <span className={hintClass}>Sleduj stav žiadosti o túto pozíciu v trackeri.</span>
      </div>

      <FeedbackMessage feedback={feedback} />

      {!requirements ? (
        <Section title="Požiadavky">
          <p className={`${hintClass} mb-3`}>Inzerát ešte nie je analyzovaný.</p>
          <button
            type="button"
            onClick={handleAnalyzePosting}
            disabled={busy !== null || !hasApiKey}
            className={primaryButton}
          >
            {busy === 'posting' ? 'Analyzujem…' : 'Analyzovať inzerát'}
          </button>
          {!hasApiKey && <MissingKey onOpenSettings={onOpenSettings} />}
        </Section>
      ) : (
        <>
          <Section title="Zhoda s tvojím CV">
            {match ? (
              <ScoreCard match={match} />
            ) : (
              <p className={hintClass}>
                Na porovnanie potrebuješ profil.{' '}
                <button type="button" onClick={onOpenProfile} className="underline">
                  Vytvor si ho
                </button>
                .
              </p>
            )}
          </Section>

          <Section title="Požiadavky">
            <dl className="mb-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Info label="Seniorita" value={SENIORITY_LABELS[requirements.seniority]} />
              <Info label="Spôsob práce" value={WORK_MODE_LABELS[requirements.workMode]} />
              <Info label="Lokalita" value={requirements.location ?? 'neuvedená'} />
              <Info label="Plat" value={requirements.salary ?? 'neuvedený'} />
            </dl>

            {requirements.languages.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-semibold">Jazyky</h3>
                <ul className="space-y-1 text-sm">
                  {compareLanguages(profile?.cv.languages ?? [], requirements.languages).map((check) => (
                    <li key={check.language}>
                      {check.cvLevel ? '✓' : '✗'} {check.language}
                      {check.requiredLevel && ` (požadované: ${check.requiredLevel})`}
                      {' – '}
                      {check.cvLevel ? `v CV: ${check.cvLevel}` : 'v CV chýba'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <details>
              <summary className="cursor-pointer text-sm font-medium">Upraviť zručnosti z inzerátu</summary>
              <p className={`${hintClass} my-3`}>
                AI sa môže pomýliť. Úpravy sa hneď prejavia v skóre.
              </p>
              <div className="space-y-6">
                <TagListEditor
                  label="Povinné zručnosti"
                  placeholder="napr. React"
                  items={requirements.mustHaveSkills}
                  onChange={(mustHaveSkills) => savePosting({ requirements: { ...requirements, mustHaveSkills } })}
                />
                <TagListEditor
                  label="Výhodou"
                  placeholder="napr. Docker"
                  items={requirements.niceToHaveSkills}
                  onChange={(niceToHaveSkills) =>
                    savePosting({ requirements: { ...requirements, niceToHaveSkills } })
                  }
                />
              </div>
            </details>
          </Section>

          <Section title="Odporúčania AI">
            {analysis?.insights ? (
              <div className="space-y-5 text-sm">
                {insightsOutdated && (
                  <p className="text-amber-700 dark:text-amber-400">
                    Odporúčania vznikli pri inom skóre ({analysis.score ?? '–'} %). Profil alebo požiadavky
                    sa odvtedy zmenili, zváž ich vygenerovať znova.
                  </p>
                )}
                <List title="Silné stránky" items={analysis.insights.strengths} />
                {analysis.insights.gaps.length > 0 && (
                  <div>
                    <h3 className="mb-1 font-semibold">Medzery a ako ich zmierniť</h3>
                    <ul className="list-disc space-y-1 pl-5">
                      {analysis.insights.gaps.map((gap) => (
                        <li key={gap.gap}>
                          <strong>{gap.gap}:</strong> {gap.mitigation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <List title="Čo v CV zvýrazniť" items={analysis.insights.highlights} />
                {analysis.insights.rewrites.length > 0 && (
                  <div>
                    <h3 className="mb-1 font-semibold">Návrhy preformulovania</h3>
                    <ul className="space-y-3">
                      {analysis.insights.rewrites.map((rewrite) => (
                        <li key={rewrite.original} className="rounded-md bg-slate-100 p-3 dark:bg-slate-900">
                          <p className="text-slate-500 dark:text-slate-400 line-through">{rewrite.original}</p>
                          <p className="mt-1">{rewrite.suggestion}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {droppedRewrites > 0 && (
                  <p className={hintClass}>
                    {droppedRewrites}× návrh vyradený, lebo sa odvolával na text, ktorý v tvojom CV nie je.
                  </p>
                )}
              </div>
            ) : (
              <p className={`${hintClass} mb-3`}>
                AI ti povie, čo vyzdvihnúť, ako zmierniť medzery a ako preformulovať body v CV. Nikdy si
                nevymyslí skúsenosť, ktorú v CV nemáš.
              </p>
            )}
            <button
              type="button"
              onClick={handleInsights}
              disabled={busy !== null || !match || !hasApiKey}
              className={`${analysis?.insights ? secondaryButton : primaryButton} mt-4`}
            >
              {busy === 'insights' ? 'Pripravujem…' : analysis?.insights ? 'Vygenerovať znova' : 'Získať odporúčania'}
            </button>
            {!hasApiKey && <MissingKey onOpenSettings={onOpenSettings} />}
          </Section>

          <Section title="Motivačný list">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="letter-language" className="text-sm">
                Jazyk
              </label>
              <select
                id="letter-language"
                value={letterLanguage}
                onChange={(e) => setLetterLanguage(e.target.value as CoverLetterLanguage)}
                className={`${inputClass} w-auto`}
              >
                <option value="sk">slovenčina</option>
                <option value="en">angličtina</option>
              </select>
              <button
                type="button"
                onClick={handleCoverLetter}
                disabled={busy !== null || !match || !hasApiKey}
                className={secondaryButton}
              >
                {busy === 'letter' ? 'Píšem…' : 'Napísať návrh'}
              </button>
            </div>
            {analysis?.coverLetter && (
              <div className="mt-4">
                <pre className="rounded-md bg-slate-100 p-3 font-sans text-sm whitespace-pre-wrap dark:bg-slate-900">
                  {analysis.coverLetter.text}
                </pre>
                <button
                  type="button"
                  onClick={() => copyLetter(analysis.coverLetter?.text ?? '')}
                  className={`${secondaryButton} mt-2`}
                >
                  Kopírovať
                </button>
                <p className={`${hintClass} mt-2`}>Je to návrh. Pred odoslaním si ho prečítaj a uprav.</p>
              </div>
            )}
          </Section>
        </>
      )}

      <details>
        <summary className="cursor-pointer text-sm font-medium">Text inzerátu</summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-slate-100 p-3 font-sans text-sm whitespace-pre-wrap dark:bg-slate-900">
          {posting.text}
        </pre>
      </details>

      <button type="button" onClick={handleDelete} className={dangerButton}>
        Vymazať inzerát
      </button>
    </div>
  )
}

function postingInfo(posting: JobPosting, requirements: JobRequirements) {
  return { title: posting.title, company: posting.company, requirements }
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function MissingKey({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <p className={`${hintClass} mt-2`}>
      Potrebuješ API kľúč.{' '}
      <button type="button" onClick={onOpenSettings} className="underline">
        Zadaj ho v Nastaveniach
      </button>
      .
    </p>
  )
}
