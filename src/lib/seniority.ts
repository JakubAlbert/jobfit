import type { JobPosting, Seniority } from '../db/schema'

// Reads seniority from a job title ("Senior Backend Developer", "Junior/Medior QA", "Team Lead").
// Deterministic on purpose: the title is the most reliable source, and a keyword check cannot
// misread it the way a model sometimes does. Checked from the most senior level down, so
// "Senior Team Lead" is lead and "Junior/Medior" is mid.

const RULES: [Seniority, RegExp][] = [
  ['lead', /\b(lead|leader|head of|principal|staff|veduci|teamlead|tech lead|architect)\b/],
  ['senior', /\b(senior|sr)\b/],
  ['mid', /\b(medior|mid|middle|mid-level|regular)\b/],
  ['junior', /\b(junior|jr|graduate|absolvent|trainee|intern|internship|staz|stazista|entry level)\b/],
]

export function seniorityFromTitle(title: string): Seniority {
  const text = title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[./]/g, ' ')
  return RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? 'unknown'
}

/**
 * For postings analysed before titles were checked: fills in an "unknown" seniority from the title.
 * Returns the updated posting, or null when nothing changes (a level chosen by hand is never touched).
 */
export function fillSeniorityFromTitle(posting: JobPosting): JobPosting | null {
  const fromTitle = seniorityFromTitle(posting.title)
  if (!posting.requirements || posting.requirements.seniority !== 'unknown' || fromTitle === 'unknown') return null
  return { ...posting, requirements: { ...posting.requirements, seniority: fromTitle } }
}

/** The title wins when it names a level; otherwise the level read from the posting text is kept. */
export function resolveSeniority(title: string, fromText: Seniority): Seniority {
  const fromTitle = seniorityFromTitle(title)
  return fromTitle === 'unknown' ? fromText : fromTitle
}
