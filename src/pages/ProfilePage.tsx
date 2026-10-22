import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { CvEditor } from '../components/CvEditor'
import {
  FeedbackMessage,
  hintClass,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
  Section,
  type Feedback,
} from '../components/ui'
import { db, PROFILE_ID } from '../db/db'
import type { CvData } from '../db/schema'
import { anonymize, PLACEHOLDERS, type PersonalDataKind } from '../lib/anonymize'
import { cleanCv, EMPTY_CV, parseCv } from '../lib/cv'
import { GeminiError } from '../lib/gemini'
import { extractPdfText, PdfError } from '../lib/pdf'
import { notifyOnboardingProgress } from '../lib/onboarding'
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
  const [step, setStep] = useState<'input' | 'edit'>('input')
  const [rawText, setRawText] = useState('')
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [cv, setCv] = useState<CvData>(EMPTY_CV)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const hasApiKey = Boolean(loadSettings().apiKey)

  useEffect(() => {
    db.profiles
      .get(PROFILE_ID)
      .then((profile) => {
        if (!profile) return
        setRawText(profile.rawText)
        setFullName(profile.fullName)
        setAddress(profile.address)
        setCv(profile.cv)
        setStep('edit')
      })
      .catch(() => setFeedback({ tone: 'error', text: 'Profil sa nepodarilo načítať.' }))
      .finally(() => setLoading(false))
  }, [])

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
        id: PROFILE_ID,
        rawText,
        fullName: fullName.trim(),
        address: address.trim(),
        cv: cleaned,
        updatedAt: new Date().toISOString(),
      })
      setCv(cleaned)
      notifyOnboardingProgress()
      setFeedback({ tone: 'success', text: 'Profil je uložený.' })
    } catch {
      setFeedback({ tone: 'error', text: 'Profil sa nepodarilo uložiť.' })
    }
  }

  if (loading) return <p className={hintClass}>Načítavam profil…</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profil</h1>

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
              <pre className="max-h-80 overflow-auto rounded-md bg-slate-100 p-3 text-xs whitespace-pre-wrap dark:bg-slate-900">
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
          </div>
          <FeedbackMessage feedback={feedback} />
        </>
      )}
    </div>
  )
}
