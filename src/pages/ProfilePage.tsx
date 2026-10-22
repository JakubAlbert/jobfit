import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { CvEditor } from '../components/CvEditor'
import {
  dangerButton,
  FeedbackMessage,
  PageHeader,
  hintClass,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
  Section,
  type Feedback,
} from '../components/ui'
import { db, PROFILE_ID } from '../db/db'
import type { CvData, Profile } from '../db/schema'
import { anonymize, PLACEHOLDERS, type PersonalDataKind } from '../lib/anonymize'
import { cleanCv, EMPTY_CV, parseCv } from '../lib/cv'
import { GeminiError } from '../lib/gemini'
import { extractPdfText, PdfError } from '../lib/pdf'
import { notifyOnboardingProgress } from '../lib/onboarding'
import { MAIN_PROFILE_NAME, newProfileVersion, sortProfiles } from '../lib/profiles'
import { loadSettings } from '../lib/settings'

const KIND_LABELS: Record<PersonalDataKind, string> = {
  email: 'e-mail',
  link: 'odkaz',
  address: 'adresa',
  phone: 'telefón',
  name: 'meno',
}

export function ProfilePage({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedId, setSelectedId] = useState(PROFILE_ID)
  const [name, setName] = useState(MAIN_PROFILE_NAME)
  const [step, setStep] = useState<'input' | 'edit'>('input')
  const [rawText, setRawText] = useState('')
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [cv, setCv] = useState<CvData>(EMPTY_CV)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const hasApiKey = Boolean(loadSettings().apiKey)

  // Loads the list of versions and the selected one into the form.
  useEffect(() => {
    db.profiles
      .toArray()
      .then((all) => {
        setProfiles(sortProfiles(all))
        const profile = all.find((item) => item.id === selectedId)
        setName(profile?.name ?? MAIN_PROFILE_NAME)
        setRawText(profile?.rawText ?? '')
        setFullName(profile?.fullName ?? '')
        setAddress(profile?.address ?? '')
        setCv(profile?.cv ?? EMPTY_CV)
        setStep(profile ? 'edit' : 'input')
      })
      .catch(() => setFeedback({ tone: 'error', text: 'Profil sa nepodarilo načítať.' }))
      .finally(() => setLoading(false))
  }, [selectedId])

  function selectVersion(id: string) {
    setFeedback(null)
    setSelectedId(id)
  }

  async function handleNewVersion() {
    const current = profiles.find((profile) => profile.id === selectedId)
    if (!current) return
    const copy = newProfileVersion(current, profiles)
    await db.profiles.add(copy)
    selectVersion(copy.id)
    setFeedback({ tone: 'success', text: `Vytvorená ${copy.name} ako kópia. Uprav ju a pomenuj podľa typu pozícií.` })
  }

  async function handleDeleteVersion() {
    if (selectedId === PROFILE_ID || !window.confirm(`Vymazať verziu „${name}“?`)) return
    await db.transaction('rw', db.profiles, db.postings, async () => {
      await db.profiles.delete(selectedId)
      // Postings compared with this version go back to the main CV.
      await db.postings.toCollection().modify((posting) => {
        if (posting.profileId === selectedId) posting.profileId = null
      })
    })
    selectVersion(PROFILE_ID)
  }

  // Exactly what would be sent to Gemini; recomputed as the user types.
  const preview = useMemo(() => anonymize(rawText, { fullName, address }), [rawText, fullName, address])
  const replaced = (Object.keys(PLACEHOLDERS) as PersonalDataKind[])
    .filter((kind) => preview.counts[kind] > 0)
    .map((kind) => `${KIND_LABELS[kind]} ${preview.counts[kind]}×`)

  async function handlePdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setFeedback({ tone: 'info', text: 'Čítam PDF…' })
    try {
      setRawText(await extractPdfText(await file.arrayBuffer()))
      setFeedback({ tone: 'success', text: 'Text z PDF je načítaný. Skontroluj ho a náhľad nižšie.' })
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof PdfError ? error.message : 'PDF sa nepodarilo načítať.' })
    } finally {
      setBusy(false)
    }
  }

  async function handleAnalyze() {
    setBusy(true)
    setFeedback({ tone: 'info', text: 'Analyzujem CV…' })
    try {
      const parsed = await parseCv(loadSettings(), rawText, { fullName, address }, (text) =>
        setFeedback({ tone: 'info', text }),
      )
      setCv(parsed)
      setStep('edit')
      setFeedback({ tone: 'success', text: 'Hotovo. Skontroluj výsledok, uprav ho a ulož.' })
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof GeminiError ? error.message : 'Analýza zlyhala.' })
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    const cleaned = cleanCv(cv)
    try {
      await db.profiles.put({
        id: selectedId,
        name: name.trim() || (selectedId === PROFILE_ID ? MAIN_PROFILE_NAME : 'Verzia'),
        rawText,
        fullName: fullName.trim(),
        address: address.trim(),
        cv: cleaned,
        updatedAt: new Date().toISOString(),
      })
      setCv(cleaned)
      setProfiles(sortProfiles(await db.profiles.toArray()))
      notifyOnboardingProgress()
      setFeedback({ tone: 'success', text: 'Profil je uložený.' })
    } catch {
      setFeedback({ tone: 'error', text: 'Profil sa nepodarilo uložiť.' })
    }
  }

  if (loading) return <p className={hintClass}>Načítavam profil…</p>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
        lead="Tvoje CV v štruktúrovanej podobe. Z neho sa počíta zhoda s inzerátmi."
      />

      {profiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Verzie CV" className="flex flex-wrap gap-1 rounded-xl bg-sunken p-1">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                role="tab"
                aria-selected={profile.id === selectedId}
                onClick={() => selectVersion(profile.id)}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink aria-selected:bg-surface aria-selected:text-accent aria-selected:shadow-sm"
              >
                {profile.name}
              </button>
            ))}
          </div>
          <button type="button" onClick={handleNewVersion} disabled={step !== 'edit'} className={secondaryButton}>
            Nová verzia
          </button>
        </div>
      )}

      {step === 'input' ? (
        <>
          <Section title="1. Osobné údaje na anonymizáciu">
            <p className={`${hintClass} mb-4`}>
              Tieto údaje sa nikam neposielajú. Slúžia len na to, aby ich aplikácia z CV pred odoslaním do
              AI odstránila.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="full-name" className={labelClass}>
                  Meno a priezvisko
                </label>
                <input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className={`${inputClass} mt-1`}
                />
              </div>
              <div>
                <label htmlFor="address" className={labelClass}>
                  Adresa
                </label>
                <input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ulica 1, 811 01 Mesto"
                  autoComplete="street-address"
                  className={`${inputClass} mt-1`}
                />
              </div>
            </div>
          </Section>

          <Section title="2. Životopis">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={busy}
                className={secondaryButton}
              >
                Nahrať PDF
              </button>
              <span className={hintClass}>alebo vlož text CV:</span>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handlePdf}
                className="hidden"
              />
            </div>
            <label htmlFor="cv-text" className="sr-only">
              Text životopisu
            </label>
            <textarea
              id="cv-text"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={12}
              placeholder="Sem vlož text svojho CV…"
              className={inputClass}
            />
          </Section>

          {rawText.trim() && (
            <Section title="3. Čo sa odošle do AI">
              <p className={`${hintClass} mb-2`}>
                {replaced.length > 0
                  ? `Odstránené: ${replaced.join(', ')}.`
                  : 'Nenašli sa žiadne osobné údaje. Sú vyplnené meno a adresa?'}{' '}
                Skontroluj, či v texte nezostalo nič osobné.
              </p>
              <pre className="max-h-80 overflow-auto rounded-2xl bg-sunken p-4 text-xs leading-relaxed whitespace-pre-wrap">
                {preview.text}
              </pre>
            </Section>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={busy || !rawText.trim() || !hasApiKey}
              className={primaryButton}
            >
              {busy ? 'Pracujem…' : 'Analyzovať CV'}
            </button>
            <button type="button" onClick={() => setStep('edit')} disabled={busy} className={secondaryButton}>
              Vyplniť ručne
            </button>
          </div>
          {!hasApiKey && (
            <p className={hintClass}>
              Na analýzu potrebuješ API kľúč.{' '}
              <button type="button" onClick={onOpenSettings} className="underline">
                Zadaj ho v Nastaveniach
              </button>
              .
            </p>
          )}
          <FeedbackMessage feedback={feedback} />
        </>
      ) : (
        <>
          <Section title="Tvoje CV">
            {profiles.length > 1 || selectedId !== PROFILE_ID ? (
              <div className="mb-6 max-w-sm">
                <label htmlFor="profile-name" className={labelClass}>
                  Názov verzie
                </label>
                <input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="napr. Frontend"
                  className={`${inputClass} mt-1`}
                />
              </div>
            ) : null}
            <CvEditor value={cv} onChange={setCv} />
          </Section>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleSave} className={primaryButton}>
              Uložiť profil
            </button>
            <button
              type="button"
              onClick={() => {
                setFeedback(null)
                setStep('input')
              }}
              className={secondaryButton}
            >
              Nahrať nové CV
            </button>
            {selectedId !== PROFILE_ID && (
              <button type="button" onClick={handleDeleteVersion} className={`${dangerButton} sm:ml-auto`}>
                Vymazať verziu
              </button>
            )}
          </div>
          <FeedbackMessage feedback={feedback} />
        </>
      )}
    </div>
  )
}
