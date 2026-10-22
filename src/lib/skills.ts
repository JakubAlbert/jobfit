import { SKILL_SYNONYMS } from '../data/skillSynonyms'

// Turns the many ways a skill is written ("JS", "Javascript", "React 18", "Node JS")
// into one comparison key, so CV and job posting skills can be matched exactly.

export interface CanonicalSkill {
  /** Comparison key; equal keys mean the same skill. */
  key: string
  /** Name to show: the dictionary name if known, otherwise the text as written. */
  label: string
}

/** Lowercase, no diacritics, single spaces, no trailing punctuation. */
export function normalizeSkill(skill: string): string {
  return skill
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:]+|[\s,;:.]+$/g, '')
}

// Normalized alias (and canonical name) → canonical name.
const ALIASES = new Map<string, string>()
for (const [canonical, aliases] of Object.entries(SKILL_SYNONYMS)) {
  for (const name of [canonical, ...aliases]) ALIASES.set(normalizeSkill(name), canonical)
}

// "react 18", "python 3.12", "java 17+", "angular v16"
const TRAILING_VERSION = /\s+v?\d+(?:\.\d+)*\+?$/

export function canonicalSkill(skill: string): CanonicalSkill {
  const normalized = normalizeSkill(skill)
  // The full text first, so names that end in a number ("Office 365") are not cut.
  const canonical = ALIASES.get(normalized) ?? ALIASES.get(normalized.replace(TRAILING_VERSION, ''))
  if (canonical) return { key: normalizeSkill(canonical), label: canonical }
  return { key: normalized.replace(TRAILING_VERSION, ''), label: skill.trim() }
}

/** Canonical skills without empty entries and duplicates (first occurrence wins). */
export function canonicalSkills(skills: string[]): CanonicalSkill[] {
  const seen = new Set<string>()
  const result: CanonicalSkill[] = []
  for (const skill of skills) {
    const canonical = canonicalSkill(skill)
    if (canonical.key && !seen.has(canonical.key)) {
      seen.add(canonical.key)
      result.push(canonical)
    }
  }
  return result
}
