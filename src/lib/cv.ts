import { CvDataSchema, type CvData } from '../db/schema'
import { parseCvPrompt, parseCvSystemInstruction } from '../prompts/parseCv'
import { anonymize, type PersonalInfo } from './anonymize'
import { generateStructured, type GeminiConfig } from './gemini'

export const EMPTY_CV: CvData = { skills: [], experience: [], education: [], languages: [], certificates: [] }

/**
 * Sends the CV to Gemini and returns structured data.
 * Takes the raw text and anonymizes it here, so no caller can send personal data by mistake.
 */
export async function parseCv(
  config: GeminiConfig,
  rawText: string,
  personal: PersonalInfo,
  onStatus?: (message: string) => void,
): Promise<CvData> {
  const { text } = anonymize(rawText, personal)
  const cv = await generateStructured(config, {
    schema: CvDataSchema,
    systemInstruction: parseCvSystemInstruction,
    prompt: parseCvPrompt(text),
    onStatus,
  })
  return cleanCv(cv)
}

/** Trims text, drops empty entries and duplicate skills/certificates. Used after AI and before saving. */
export function cleanCv(cv: CvData): CvData {
  const isFilled = (entry: object) => Object.values(entry).some((value) => String(value).trim())
  const trimAll = <T extends Record<string, string>>(entry: T): T =>
    Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, value.trim()])) as T

  return {
    skills: addUnique([], cv.skills),
    experience: cv.experience.map(trimAll).filter(isFilled),
    education: cv.education.map(trimAll).filter(isFilled),
    languages: cv.languages.map(trimAll).filter(isFilled),
    certificates: addUnique([], cv.certificates),
  }
}

/**
 * Adds items to a list, ignoring empty ones and case-insensitive duplicates.
 * A comma-separated string is split, so "React, Vue" adds two skills at once.
 */
export function addUnique(list: string[], items: string | string[]): string[] {
  const candidates = typeof items === 'string' ? items.split(',') : items
  const result = [...list]
  const seen = new Set(list.map((item) => item.toLowerCase()))
  for (const candidate of candidates) {
    const item = candidate.trim()
    if (item && !seen.has(item.toLowerCase())) {
      seen.add(item.toLowerCase())
      result.push(item)
    }
  }
  return result
}
