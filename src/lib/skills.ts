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
function buildAliases(entries: Iterable<[string, string[]]>): Map<string, string> {
  const aliases = new Map<string, string>()
  for (const [canonical, names] of entries) {
    for (const name of [canonical, ...names]) aliases.set(normalizeSkill(name), canonical)
  }
  return aliases
}

const BUILT_IN = buildAliases(Object.entries(SKILL_SYNONYMS))

// The user's own synonyms (from the database), checked before the built-in dictionary.
// Module state on purpose: matching runs in many places (lists, tracker, detail) and threading the
// list through all of them would add a parameter everywhere for something that changes rarely.
let custom = new Map<string, string>()

export function setCustomSynonyms(synonyms: { canonical: string; aliases: string[] }[]): void {
  custom = buildAliases(synonyms.map(({ canonical, aliases }) => [canonical, aliases]))
}

const lookup = (key: string) => custom.get(key) ?? BUILT_IN.get(key)

// "react 18", "python 3.12", "java 17+", "angular v16"
const TRAILING_VERSION = /\s+v?\d+(?:\.\d+)*\+?$/

export function canonicalSkill(skill: string): CanonicalSkill {
  const normalized = normalizeSkill(skill)
  // The full text first, so names that end in a number ("Office 365") are not cut.
  const canonical = lookup(normalized) ?? lookup(normalized.replace(TRAILING_VERSION, ''))
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
