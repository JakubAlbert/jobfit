import { useEffect, useState, type FormEvent } from 'react'
import { db } from '../db/db'
import type { SkillSynonym } from '../db/schema'
import { loadCustomSynonyms, synonymFromInput } from '../lib/synonyms'
import { FeedbackMessage, hintClass, inputClass, labelClass, secondaryButton, Section, type Feedback } from './ui'

/** Lets the user teach the matcher their field's vocabulary, e.g. "Pohoda" counts as "Účtovníctvo". */
export function SynonymsSection() {
  const [synonyms, setSynonyms] = useState<SkillSynonym[]>([])
  const [canonical, setCanonical] = useState('')
  const [aliases, setAliases] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)

  useEffect(() => {
    loadCustomSynonyms().then(setSynonyms)
  }, [])

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    const synonym = synonymFromInput(canonical, aliases)
    if (!synonym) {
      setFeedback({ tone: 'error', text: 'Vyplň názov zručnosti a aspoň jeden iný zápis.' })
      return
    }
    await db.synonyms.add(synonym)
    setSynonyms(await loadCustomSynonyms())
    setCanonical('')
    setAliases('')
    setFeedback({ tone: 'success', text: `Pridané. „${synonym.aliases.join('“, „')}“ sa teraz počíta ako ${synonym.canonical}.` })
  }

  async function handleDelete(id: string) {
    await db.synonyms.delete(id)
    setSynonyms(await loadCustomSynonyms())
    setFeedback(null)
  }

  return (
    <Section title="Vlastné synonymá zručností">
      <p className={`${hintClass} mb-4 max-w-prose`}>
        Ak sa zručnosť v CV a v inzeráte píše inak a appka ich nespáruje, doplň to tu. Napríklad „Pohoda, Money
        S3“ ako „Účtovníctvo“. Platí to pre všetky inzeráty a skóre sa hneď prepočíta.
      </p>

      {synonyms.length > 0 && (
        <ul className="mb-5 space-y-2">
          {synonyms.map((synonym) => (
            <li key={synonym.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-sunken px-3 py-2 text-sm">
              <span className="font-semibold">{synonym.canonical}</span>
              <span className="text-muted">=</span>
              {synonym.aliases.map((alias) => (
                <span key={alias} className="rounded-full bg-surface px-2.5 py-0.5 ring-1 ring-line">
                  {alias}
                </span>
              ))}
              <button
                type="button"
                onClick={() => handleDelete(synonym.id)}
                className="ml-auto font-semibold text-rejected-ink hover:underline"
              >
                Odstrániť
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
        <div>
          <label htmlFor="synonym-canonical" className={labelClass}>
            Zručnosť
          </label>
          <input
            id="synonym-canonical"
            value={canonical}
            onChange={(e) => setCanonical(e.target.value)}
            placeholder="napr. Účtovníctvo"
            className={`${inputClass} mt-1`}
          />
        </div>
        <div>
          <label htmlFor="synonym-aliases" className={labelClass}>
            Iné zápisy (oddelené čiarkou)
          </label>
          <input
            id="synonym-aliases"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="napr. Pohoda, Money S3"
            className={`${inputClass} mt-1`}
          />
        </div>
        <button type="submit" className={secondaryButton}>
          Pridať
        </button>
      </form>
      <div className="mt-3">
        <FeedbackMessage feedback={feedback} />
      </div>
    </Section>
  )
}
