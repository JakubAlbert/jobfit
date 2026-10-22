import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { clearAllData, exportData, importData, ImportError } from '../db/backup'
import { generateStructured, GeminiError } from '../lib/gemini'
import { clearSettings, DEFAULT_MODEL, loadSettings, saveSettings } from '../lib/settings'
import { connectionTestPrompt, connectionTestSchema } from '../prompts/connectionTest'

type Feedback = { tone: 'info' | 'success' | 'error'; text: string } | null

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
      setDataFeedback({ tone: 'success', text: 'Dáta zo zálohy sú nahraté.' })
    } catch (error) {
      const text = error instanceof ImportError ? error.message : 'Import zlyhal.'
      setDataFeedback({ tone: 'error', text })
    }
  }

  async function handleClear() {
    const confirmed = window.confirm(
      'Naozaj vymazať všetky dáta? Zmaže sa CV, inzeráty, žiadosti aj uložený API kľúč. Nedá sa to vrátiť.',
    )
    if (!confirmed) return
    await clearAllData()
    clearSettings()
    setApiKey('')
    setModel(DEFAULT_MODEL)
    setKeyFeedback(null)
    setDataFeedback({ tone: 'success', text: 'Všetky dáta sú vymazané.' })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nastavenia</h1>

      <Section title="Gemini API">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium">
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
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
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
            <label htmlFor="model" className="block text-sm font-medium">
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
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Pri bezplatnej verzii Gemini API môže Google odoslané dáta použiť na zlepšovanie svojich
          modelov. Preto JobFit pred odoslaním z CV odstráni meno, e-mail, telefón a adresu. Všetky
          ostatné dáta zostávajú len v tomto prehliadači. Aplikácia nepoužíva žiadnu analytiku ani
          sledovanie.
        </p>
      </Section>

      <Section title="Dáta">
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
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
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 p-4 sm:p-6 dark:border-slate-800">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  const tones = {
    info: 'text-slate-700 dark:text-slate-300',
    success: 'text-green-700 dark:text-green-400',
    error: 'text-red-700 dark:text-red-400',
  }
  return (
    <p role={feedback.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${tones[feedback.tone]}`}>
      {feedback.text}
    </p>
  )
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900'
const primaryButton =
  'rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300'
const secondaryButton =
  'rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800'
