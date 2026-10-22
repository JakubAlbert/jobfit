import { z } from 'zod'

// Every stored entity is defined once as a Zod schema; TypeScript types are inferred from it.
// The same schemas validate imported backups, so types and runtime checks cannot drift apart.
//
// Conventions:
// - IDs are UUID strings (crypto.randomUUID), so records from a backup never collide with auto-increment keys.
// - Timestamps are ISO 8601 strings, user-entered dates are YYYY-MM-DD. Both survive JSON export unchanged,
//   unlike Date objects.

const id = z.string().min(1)
const timestamp = z.iso.datetime()
const date = z.iso.date()

// --- CV / profile ---

export const ExperienceSchema = z.object({
  position: z.string(),
  company: z.string(),
  period: z.string(),
  description: z.string(),
})

export const EducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  period: z.string(),
})

export const LanguageSchema = z.object({
  language: z.string(),
  level: z.string(),
})

export const CvDataSchema = z.object({
  skills: z.array(z.string()),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  languages: z.array(LanguageSchema),
  certificates: z.array(z.string()),
})

export const ProfileSchema = z.object({
  id,
  /** Original CV text. Stays local; only an anonymized copy is ever sent to the API. */
  rawText: z.string(),
  cv: CvDataSchema,
  updatedAt: timestamp,
})

// --- Job posting ---

export const SENIORITIES = ['junior', 'mid', 'senior', 'lead', 'unknown'] as const
export const WORK_MODES = ['onsite', 'hybrid', 'remote', 'unknown'] as const

export const JobRequirementsSchema = z.object({
  mustHaveSkills: z.array(z.string()),
  niceToHaveSkills: z.array(z.string()),
  seniority: z.enum(SENIORITIES),
  location: z.string().nullable(),
  workMode: z.enum(WORK_MODES),
  salary: z.string().nullable(),
  languages: z.array(LanguageSchema),
})

export const JobPostingSchema = z.object({
  id,
  title: z.string(),
  company: z.string(),
  url: z.string(),
  text: z.string(),
  /** Null until the posting has been analyzed. */
  requirements: JobRequirementsSchema.nullable(),
  createdAt: timestamp,
})

// --- CV vs. posting analysis ---

export const AiInsightsSchema = z.object({
  strengths: z.array(z.string()),
  gaps: z.array(z.object({ gap: z.string(), mitigation: z.string() })),
  highlights: z.array(z.string()),
  rewrites: z.array(z.object({ original: z.string(), suggestion: z.string() })),
})

export const AnalysisSchema = z.object({
  id,
  postingId: id,
  profileId: id,
  /** Deterministic match score 0–100, computed in code, never by AI. */
  score: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()),
  missingMustHave: z.array(z.string()),
  missingNiceToHave: z.array(z.string()),
  /** Qualitative AI part; null if it has not been requested yet. */
  insights: AiInsightsSchema.nullable(),
  createdAt: timestamp,
})

// --- Application tracker ---

export const APPLICATION_STATUSES = [
  'saved',
  'applied',
  'interview',
  'offer',
  'rejected',
  'no_response',
] as const

export const ApplicationSchema = z.object({
  id,
  company: z.string(),
  position: z.string(),
  postingId: id.nullable(),
  status: z.enum(APPLICATION_STATUSES),
  appliedDate: date.nullable(),
  responseDate: date.nullable(),
  followUpDate: date.nullable(),
  notes: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
})

// --- AI response cache (not exported: it can always be rebuilt) ---

export const AiCacheEntrySchema = z.object({
  /** SHA-256 hash of the request input. */
  hash: z.string(),
  value: z.unknown(),
  createdAt: timestamp,
})

export type Experience = z.infer<typeof ExperienceSchema>
export type Education = z.infer<typeof EducationSchema>
export type Language = z.infer<typeof LanguageSchema>
export type CvData = z.infer<typeof CvDataSchema>
export type Profile = z.infer<typeof ProfileSchema>
export type Seniority = (typeof SENIORITIES)[number]
export type WorkMode = (typeof WORK_MODES)[number]
export type JobRequirements = z.infer<typeof JobRequirementsSchema>
export type JobPosting = z.infer<typeof JobPostingSchema>
export type AiInsights = z.infer<typeof AiInsightsSchema>
export type Analysis = z.infer<typeof AnalysisSchema>
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]
export type Application = z.infer<typeof ApplicationSchema>
export type AiCacheEntry = z.infer<typeof AiCacheEntrySchema>
