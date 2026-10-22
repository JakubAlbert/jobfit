import type { CoverLetterLanguage } from '../db/schema'

// Prompt for a cover letter draft (response schema: { letter: string }).

const LANGUAGE_NAMES: Record<CoverLetterLanguage, string> = { sk: 'Slovak', en: 'English' }

export function coverLetterSystemInstruction(language: CoverLetterLanguage): string {
  return `You write a short cover letter draft (max. 250 words) in ${LANGUAGE_NAMES[language]}.
Strict rule: use only experience, skills and results stated in the CV. Never invent anything, do not claim missing requirements.
Tone: professional, concrete, not exaggerated. No placeholders except the candidate name, which must be written exactly as [MENO].
Address the company by name if it is known, otherwise use a neutral greeting.`
}

export function coverLetterPrompt(input: unknown): string {
  return JSON.stringify(input)
}
