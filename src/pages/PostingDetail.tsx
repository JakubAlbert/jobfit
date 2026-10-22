import { useEffect, useMemo, useState } from 'react'
import { RequirementsEditor } from '../components/RequirementsEditor'
import { SENIORITY_LABELS, WORK_MODE_LABELS } from '../components/statusLabels'
import { ScoreCard } from '../components/ScoreCard'
import {
  dangerButton,
  FeedbackMessage,
  hintClass,
  linkClass,
  inputClass,
  primaryButton,
  secondaryButton,
  Section,
  type Feedback,
} from '../components/ui'
import { db, PROFILE_ID } from '../db/db'
import type { Analysis, CoverLetterLanguage, JobPosting, JobRequirements, Profile } from '../db/schema'
import { newApplication } from '../lib/applications'
import { GeminiError } from '../lib/gemini'
import { compareLanguages, computeMatch, type MatchResult } from '../lib/matchScore'
import { analyzePosting, generateCoverLetter, generateInsights, generateInterviewPrep } from '../lib/posting'
import { loadSettings } from '../lib/settings'
import { PostingForm, type PostingFields } from './PostingForm'

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
  const [busy, setBusy] = useState<'posting' | 'insights' | 'prep' | 'letter' | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [droppedRewrites, setDroppedRewrites] = useState(0)
  const [letterLanguage, setLetterLanguage] = useState<CoverLetterLanguage>('sk')
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
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

  async function handleAnalyzePosting(target: JobPosting = posting) {
    setBusy('posting')
    setFeedback({ tone: 'info', text: 'Analyzujem inzerát…' })
    try {
      const requirements = await analyzePosting(loadSettings(), { title: target.title, text: target.text }, onStatus)
      const updated = { ...target, requirements }
      setPosting(updated)
      await db.postings.put(updated)
      onChanged()
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
      interviewPrep: null,
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

  async function handleInterviewPrep() {
    if (!profile || !posting.requirements || !match) return
    setBusy('prep')
    setFeedback({ tone: 'info', text: 'Pripravujem otázky na pohovor…' })
    try {
      const interviewPrep = await generateInterviewPrep(
        loadSettings(),
        { cv: profile.cv, posting: postingInfo(posting, posting.requirements), match },
        onStatus,
      )
      await saveAnalysis(match, { interviewPrep })
      setFeedback(null)
    } catch (error) {
      showError(error, 'Prípravu na pohovor sa nepodarilo vytvoriť.')
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

  /** Saves edited posting details. A changed title or text means new requirements, so it is analysed again. */
  async function handleEdit(fields: PostingFields) {
    const contentChanged = fields.text !== posting.text || fields.title !== posting.title
    const updated: JobPosting = { ...posting, ...fields, requirements: contentChanged ? null : posting.requirements }
    setPosting(updated)
    await db.postings.put(updated)
    onChanged()
    setEditing(false)
    if (contentChanged && hasApiKey) await handleAnalyzePosting(updated)
  }

  const requirements = posting.requirements
  const insightsOutdated = analysis?.insights && match && analysis.score !== match.score

  if (editing) {
    return (
      <PostingForm
        heading="Upraviť inzerát"
        lead="Keď zmeníš pozíciu alebo text, inzerát sa po uložení znova analyzuje. Ručné úpravy požiadaviek sa tým nahradia."
        submitLabel={hasApiKey ? 'Uložiť a analyzovať' : 'Uložiť'}
        initial={{ title: posting.title, company: posting.company, url: posting.url, text: posting.text }}
        onSubmit={handleEdit}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <button type="button" onClick={onBack} className={`${linkClass} text-sm`}>
          Späť na inzeráty
        </button>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">{posting.title || 'Inzerát bez názvu'}</h1>
        <p className="mt-2 text-lg text-muted">
          {posting.company || 'Firma neuvedená'}
          {posting.url && (
            <a href={posting.url} target="_blank" rel="noreferrer" className={`${linkClass} ml-3 text-sm`}>
              Pôvodný inzerát
            </a>
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
        <button type="button" onClick={() => setEditing(true)} disabled={busy !== null} className={secondaryButton}>
          Upraviť inzerát
        </button>
      </div>

      <FeedbackMessage feedback={feedback} />

      {!requirements ? (
        <Section title="Požiadavky">
          <p className={`${hintClass} mb-3`}>Inzerát ešte nie je analyzovaný.</p>
          <button
            type="button"
            onClick={() => handleAnalyzePosting()}
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

          <Section
            title="Požiadavky"
            aside={
              hasApiKey && (
                <button
                  type="button"
                  onClick={() => handleAnalyzePosting()}
                  disabled={busy !== null}
                  className={`${linkClass} text-sm`}
                >
                  {busy === 'posting' ? 'Analyzujem…' : 'Analyzovať znova'}
                </button>
              )
            }
          >
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
              <summary className="cursor-pointer text-sm font-semibold text-accent">Upraviť požiadavky</summary>
              <p className={`${hintClass} my-3`}>
                Doplň alebo oprav, čo AI nenašla alebo prečítala zle. Zmeny zručností sa hneď prejavia v skóre.
              </p>
              <RequirementsEditor value={requirements} onChange={(next) => savePosting({ requirements: next })} />
            </details>
          </Section>

          <Section title="Odporúčania AI">
            {analysis?.insights ? (
              <div className="space-y-5 text-sm">
                {insightsOutdated && (
                  <p className="rounded-xl bg-peach px-4 py-2.5 text-peach-ink">
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
                        <li key={rewrite.original} className="grid gap-2 rounded-2xl bg-sunken p-4 sm:grid-cols-2">
                          <p className="text-muted line-through decoration-muted/50">{rewrite.original}</p>
                          <p className="rounded-xl bg-offer px-3 py-2 text-offer-ink">{rewrite.suggestion}</p>
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

          <Section title="Príprava na pohovor">
            {analysis?.interviewPrep ? (
              <div className="space-y-6">
                <ol className="space-y-3">
                  {analysis.interviewPrep.questions.map((item) => (
                    <li key={item.question} className="rounded-xl bg-sunken p-4">
                      <p className="font-semibold">{item.question}</p>
                      <p className="mt-1 text-sm text-muted">{item.why}</p>
                      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
                        {item.answerPoints.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
                <List title="Na čo sa môžeš opýtať ty" items={analysis.interviewPrep.questionsToAsk} />
              </div>
            ) : (
              <p className={`${hintClass} mb-3`}>
                Pravdepodobné otázky podľa inzerátu a tvojich medzier, s bodmi z tvojho CV, o ktoré sa môžeš
                oprieť.
              </p>
            )}
            <button
              type="button"
              onClick={handleInterviewPrep}
              disabled={busy !== null || !match || !hasApiKey}
              className={`${analysis?.interviewPrep ? secondaryButton : primaryButton} mt-4`}
            >
              {busy === 'prep' ? 'Pripravujem…' : analysis?.interviewPrep ? 'Vygenerovať znova' : 'Pripraviť otázky'}
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
                className={`${inputClass} w-auto sm:w-48`}
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
                <pre className="rounded-2xl bg-sunken p-5 font-sans text-sm leading-relaxed whitespace-pre-wrap">
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
        <summary className="cursor-pointer text-sm font-semibold text-accent">Text inzerátu</summary>
        <pre className="mt-3 max-h-96 overflow-auto rounded-2xl bg-sunken p-5 font-sans text-sm leading-relaxed whitespace-pre-wrap">
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
      <dt className="text-muted">{label}</dt>
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
