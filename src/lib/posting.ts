import { z } from 'zod'
import {
  AiInsightsSchema,
  InterviewPrepSchema,
  type InterviewPrep,
  JobRequirementsSchema,
  type AiInsights,
  type CoverLetterLanguage,
  type CvData,
  type JobRequirements,
} from '../db/schema'
import { coverLetterPrompt, coverLetterSystemInstruction } from '../prompts/coverLetter'
import { interviewPrepPrompt, interviewPrepSystemInstruction } from '../prompts/interviewPrep'
import { matchInsightsPrompt, matchInsightsSystemInstruction } from '../prompts/matchInsights'
import { parsePostingPrompt, parsePostingSystemInstruction } from '../prompts/parsePosting'
import { PLACEHOLDERS } from './anonymize'
import { addUnique } from './cv'
import { generateStructured, type GeminiConfig } from './gemini'
import type { MatchResult } from './matchScore'
import { resolveSeniority } from './seniority'

type OnStatus = (message: string) => void

export interface PostingInfo {
  title: string
  company: string
  requirements: JobRequirements
}

export async function analyzePosting(
  config: GeminiConfig,
  posting: { title: string; text: string },
  onStatus?: OnStatus,
): Promise<JobRequirements> {
  const requirements = await generateStructured(config, {
    schema: JobRequirementsSchema,
    systemInstruction: parsePostingSystemInstruction,
    prompt: parsePostingPrompt(posting.title, posting.text),
    onStatus,
  })
  return {
    ...requirements,
    // A level named in the title ("Senior Backend Developer") is checked in code and wins.
    seniority: resolveSeniority(posting.title, requirements.seniority),
    mustHaveSkills: addUnique([], requirements.mustHaveSkills),
    niceToHaveSkills: addUnique([], requirements.niceToHaveSkills),
  }
}

export async function generateInsights(
  config: GeminiConfig,
  input: { cv: CvData; posting: PostingInfo; match: MatchResult },
  onStatus?: OnStatus,
): Promise<{ insights: AiInsights; droppedRewrites: number }> {
  // Only structured data goes out: the CV was parsed from anonymized text and has no personal data.
  const insights = await generateStructured(config, {
    schema: AiInsightsSchema,
    systemInstruction: matchInsightsSystemInstruction,
    prompt: matchInsightsPrompt({ cv: input.cv, job: input.posting, match: input.match }),
    onStatus,
  })
  return filterRewrites(insights, input.cv)
}

/**
 * Deterministic guard against invented content: a rewrite suggestion is kept only if the text it
 * claims to rewrite really appears in the CV. The prompt asks for this too; code enforces it.
 */
export function filterRewrites(insights: AiInsights, cv: CvData): { insights: AiInsights; droppedRewrites: number } {
  const cvText = normalizeText(cv.experience.map((entry) => `${entry.position} ${entry.description}`).join(' '))
  const rewrites = insights.rewrites.filter((rewrite) => {
    const original = normalizeText(rewrite.original)
    return original.length > 0 && cvText.includes(original)
  })
  return { insights: { ...insights, rewrites }, droppedRewrites: insights.rewrites.length - rewrites.length }
}

export async function generateInterviewPrep(
  config: GeminiConfig,
  input: { cv: CvData; posting: PostingInfo; match: MatchResult },
  onStatus?: OnStatus,
): Promise<InterviewPrep> {
  return generateStructured(config, {
    schema: InterviewPrepSchema,
    systemInstruction: interviewPrepSystemInstruction,
    prompt: interviewPrepPrompt({ cv: input.cv, job: input.posting, match: input.match }),
    onStatus,
  })
}

const CoverLetterResponseSchema = z.object({ letter: z.string().min(1) })

export async function generateCoverLetter(
  config: GeminiConfig,
  input: { cv: CvData; posting: PostingInfo; language: CoverLetterLanguage; fullName: string },
  onStatus?: OnStatus,
): Promise<string> {
  const { letter } = await generateStructured(config, {
    schema: CoverLetterResponseSchema,
    systemInstruction: coverLetterSystemInstruction(input.language),
    prompt: coverLetterPrompt({ cv: input.cv, job: input.posting }),
    onStatus,
  })
  // The name never leaves the browser; it is filled in only after the answer arrives.
  const name = input.fullName.trim()
  return name ? letter.replaceAll(PLACEHOLDERS.name, name) : letter
}

/** Lowercase, no diacritics, no quotes, single spaces: tolerant to small formatting differences. */
function normalizeText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/["'„“”‚‘’«»]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:–-]+|[\s.,;:–-]+$/g, '')
}
