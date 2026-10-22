import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
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
import { loadDemoData } from '../data/demoData'
import { clearAllData, exportData, importData, ImportError } from '../db/backup'
import { generateStructured, GeminiError } from '../lib/gemini'
import { clearSettings, DEFAULT_MODEL, loadSettings, saveSettings } from '../lib/settings'
import { notifyOnboardingProgress } from '../lib/onboarding'
import { connectionTestPrompt, connectionTestSchema } from '../prompts/connectionTest'


export function SettingsPage() {
  const [apiKey, setApiKey] = useState(() => loadSettings().apiKey)
  const [model, setModel] = useState(() => loadSettings().model)
  const [showKey, setShowKey] = useState(false)
  const [keyFeedback, setKeyFeedback] = useState<Feedback>(null)
  const [testing, setTesting] = useState(false)
  const [dataFeedback, setDataFeedback] = useState<Feedback>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function handleSave(event: FormEvent) {
    event.preventDefault()
    const saved = saveSettings({ apiKey, model })
    notifyOnboardingProgress()
    setKeyFeedback(
      saved
        ? { tone: 'success', text: 'Nastavenia sú uložené v tomto prehliadači.' }
        : { tone: 'error', text: 'Prehliadač nepovolil uložiť nastavenia (napr. súkromné okno).' },
    )
  }

  async function handleTest() {
    setTesting(true)
    setKeyFeedback({ tone: 'info', text: 'Overujem kľúč a model…' })
    try {
      await generateStructured(
        { apiKey, model: model.trim() || DEFAULT_MODEL },
        {
          schema: connectionTestSchema,
          ...connectionTestPrompt,
          cache: false,
          onStatus: (text) => setKeyFeedback({ tone: 'info', text }),
        },
      )
      setKeyFeedback({ tone: 'success', text: 'Funguje to. Kľúč aj model sú v poriadku.' })
    } catch (error) {
      const text = error instanceof GeminiError ? error.message : 'Overenie zlyhalo.'
      setKeyFeedback({ tone: 'error', text })
    } finally {
      setTesting(false)
    }
  }

  async function handleExport() {
    const backup = await exportData()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `jobfit-zaloha-${backup.exportedAt.slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setDataFeedback({ tone: 'success', text: 'Záloha je stiahnutá. API kľúč v nej nie je.' })
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow choosing the same file again
    if (!file) return
    if (!window.confirm('Import nahradí všetky súčasné dáta obsahom zálohy. Pokračovať?')) return
    try {
      await importData(await file.text())
      notifyOnboardingProgress()
      setDataFeedback({ tone: 'success', text: 'Dáta zo zálohy sú nahraté.' })
    } catch (error) {
      const text = error instanceof ImportError ? error.message : 'Import zlyhal.'
      setDataFeedback({ tone: 'error', text })
    }
  }

  async function handleDemo() {
    if (!window.confirm('Ukážkové dáta nahradia všetky súčasné dáta (profil, inzeráty, žiadosti). Pokračovať?')) return
    try {
      await loadDemoData()
      notifyOnboardingProgress()
      setDataFeedback({ tone: 'success', text: 'Ukážkové dáta sú nahraté. Pozri si Prehľad, Inzeráty a Žiadosti.' })
    } catch {
      setDataFeedback({ tone: 'error', text: 'Ukážkové dáta sa nepodarilo nahrať.' })
    }
  }

  async function handleClear() {
    const confirmed = window.confirm(
      'Naozaj vymazať všetky dáta? Zmaže sa CV, inzeráty, žiadosti aj uložený API kľúč. Nedá sa to vrátiť.',
    )
    if (!confirmed) return
    await clearAllData()
    clearSettings()
    notifyOnboardingProgress()
    setApiKey('')
    setModel(DEFAULT_MODEL)
    setKeyFeedback(null)
    setDataFeedback({ tone: 'success', text: 'Všetky dáta sú vymazané.' })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Nastavenia" lead="API kľúč, súkromie a tvoje dáta. Vzhľad prepneš ikonami v hlavičke." />

      <Section title="Gemini API">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="api-key" className={labelClass}>
              API kľúč
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className={inputClass}
              />
              <button type="button" onClick={() => setShowKey((v) => !v)} className={secondaryButton}>
                {showKey ? 'Skryť' : 'Zobraziť'}
              </button>
            </div>
            <p className={`${hintClass} mt-1`}>
              Kľúč zadarmo získaš v{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Google AI Studio
              </a>
              . Uloží sa len v tomto prehliadači a posiela sa iba do Google Gemini API.
            </p>
          </div>

          <div>
            <label htmlFor="model" className={labelClass}>
              Model
            </label>
            <input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={DEFAULT_MODEL}
              spellCheck={false}
              className={`${inputClass} mt-1`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className={primaryButton}>
              Uložiť
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !apiKey.trim()}
              className={secondaryButton}
            >
              {testing ? 'Overujem…' : 'Otestovať kľúč'}
            </button>
          </div>
          <FeedbackMessage feedback={keyFeedback} />
        </form>
      </Section>

      <Section title="Súkromie">
        <p className="max-w-prose text-sm leading-relaxed">
          Pri bezplatnej verzii Gemini API môže Google odoslané dáta použiť na zlepšovanie svojich
          modelov. Preto JobFit pred odoslaním z CV odstráni meno, e-mail, telefón a adresu. Všetky
          ostatné dáta zostávajú len v tomto prehliadači. Aplikácia nepoužíva žiadnu analytiku ani
          sledovanie.
        </p>
      </Section>

      <Section title="Dáta">
        <p className={`${hintClass} mb-4`}>
          Záloha obsahuje profil, inzeráty, analýzy a žiadosti. Použi ju na prenos do iného
          prehliadača alebo zariadenia.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleExport} className={secondaryButton}>
            Exportovať zálohu
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} className={secondaryButton}>
            Importovať zálohu
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            className="hidden"
          />
          <button type="button" onClick={handleDemo} className={secondaryButton}>
            Nahrať ukážkové dáta
          </button>
          <button type="button" onClick={handleClear} className={dangerButton}>
            Vymazať všetky dáta
          </button>
        </div>
        <div className="mt-4">
          <FeedbackMessage feedback={dataFeedback} />
        </div>
      </Section>
    </div>
  )
}
