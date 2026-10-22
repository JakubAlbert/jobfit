import type { Language } from '../db/schema'
import { canonicalSkills, normalizeSkill } from './skills'

// Deterministic CV ↔ job posting match. No AI involved: the same input always gives the same score,
// and every point can be explained. The algorithm is described in README.md.

/** A must-have skill counts twice as much as a nice-to-have one. */
export const WEIGHTS = { mustHave: 2, niceToHave: 1 } as const

export interface MatchResult {
  /** 0–100, or null when the posting lists no skills (a 0 would be misleading). */
  score: number | null
  matchedMustHave: string[]
  missingMustHave: string[]
  matchedNiceToHave: string[]
  missingNiceToHave: string[]
}

export function computeMatch(
  cvSkills: string[],
  requirements: { mustHaveSkills: string[]; niceToHaveSkills: string[] },
): MatchResult {
  const owned = new Set(canonicalSkills(cvSkills).map((skill) => skill.key))
  const mustHave = canonicalSkills(requirements.mustHaveSkills)
  const mustHaveKeys = new Set(mustHave.map((skill) => skill.key))
  // A skill listed in both groups counts once, as must-have.
  const niceToHave = canonicalSkills(requirements.niceToHaveSkills).filter((skill) => !mustHaveKeys.has(skill.key))

  const split = (skills: typeof mustHave) => ({
    matched: skills.filter((skill) => owned.has(skill.key)).map((skill) => skill.label),
    missing: skills.filter((skill) => !owned.has(skill.key)).map((skill) => skill.label),
  })
  const must = split(mustHave)
  const nice = split(niceToHave)

  const maxPoints = WEIGHTS.mustHave * mustHave.length + WEIGHTS.niceToHave * niceToHave.length
  const points = WEIGHTS.mustHave * must.matched.length + WEIGHTS.niceToHave * nice.matched.length

  return {
    score: maxPoints === 0 ? null : Math.round((100 * points) / maxPoints),
    matchedMustHave: must.matched,
    missingMustHave: must.missing,
    matchedNiceToHave: nice.matched,
    missingNiceToHave: nice.missing,
  }
}

// --- Languages: shown next to the score, not part of it. Levels ("B2", "fluent", "komunikatívne")
// are too inconsistent to compare reliably in code, so only the language itself is matched.

const LANGUAGE_NAMES: Record<string, string[]> = {
  english: ['english', 'anglictina', 'anglicky', 'anglicky jazyk', 'aj', 'en'],
  german: ['german', 'nemcina', 'nemecky', 'nemecky jazyk', 'nj', 'de', 'deutsch'],
  slovak: ['slovak', 'slovencina', 'slovensky', 'slovensky jazyk', 'sk'],
  czech: ['czech', 'cestina', 'cesky', 'cesky jazyk', 'cz', 'cs'],
  hungarian: ['hungarian', 'madarcina', 'madarsky', 'hu'],
  polish: ['polish', 'polstina', 'polsky', 'pl'],
  french: ['french', 'francuzstina', 'francuzsky', 'fr'],
  spanish: ['spanish', 'spanielcina', 'spanielsky', 'es'],
  italian: ['italian', 'taliancina', 'taliansky', 'it'],
  russian: ['russian', 'rustina', 'rusky', 'ru'],
  ukrainian: ['ukrainian', 'ukrajincina', 'ukrajinsky', 'uk', 'ua'],
}

const LANGUAGE_ALIASES = new Map(
  Object.entries(LANGUAGE_NAMES).flatMap(([key, names]) => names.map((name) => [name, key] as const)),
)

const languageKey = (language: string) => {
  const normalized = normalizeSkill(language)
  return LANGUAGE_ALIASES.get(normalized) ?? normalized
}

export interface LanguageCheck {
  language: string
  requiredLevel: string
  /** The level from the CV, or null if the CV does not mention the language. */
  cvLevel: string | null
}

export function compareLanguages(cvLanguages: Language[], required: Language[]): LanguageCheck[] {
  const cvByKey = new Map(cvLanguages.map((entry) => [languageKey(entry.language), entry.level]))
  return required.map((entry) => ({
    language: entry.language,
    requiredLevel: entry.level,
    cvLevel: cvByKey.get(languageKey(entry.language)) ?? null,
  }))
}
