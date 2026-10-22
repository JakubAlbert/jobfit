import { z } from 'zod'
import { db as defaultDb, type JobFitDb } from './db'
import { AnalysisSchema, ApplicationSchema, JobPostingSchema, ProfileSchema } from './schema'

export const BACKUP_FORMAT = 'jobfit-backup'
export const BACKUP_VERSION = 1

// The AI cache is intentionally left out: it can always be rebuilt.
// The API key lives in localStorage, not in the database, so it can never end up in a backup file.
export const BackupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.iso.datetime(),
  data: z.object({
    profiles: z.array(ProfileSchema),
    postings: z.array(JobPostingSchema),
    analyses: z.array(AnalysisSchema),
    applications: z.array(ApplicationSchema),
  }),
})

export type Backup = z.infer<typeof BackupSchema>

/** Thrown when a backup file cannot be imported. The message is shown to the user (in Slovak). */
export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

export async function exportData(database: JobFitDb = defaultDb): Promise<Backup> {
  const [profiles, postings, analyses, applications] = await Promise.all([
    database.profiles.toArray(),
    database.postings.toArray(),
    database.analyses.toArray(),
    database.applications.toArray(),
  ])
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { profiles, postings, analyses, applications },
  }
}

/**
 * Replaces all data with the content of a backup file.
 * The file is fully validated first, and the write runs in one transaction,
 * so on any error the existing data stays untouched.
 */
export async function importData(json: string, database: JobFitDb = defaultDb): Promise<void> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new ImportError('Súbor nie je platný JSON.')
  }

  const result = BackupSchema.safeParse(parsed)
  if (!result.success) {
    throw new ImportError(describeBackupError(parsed))
  }

  const { profiles, postings, analyses, applications } = result.data.data
  const tables = [database.profiles, database.postings, database.analyses, database.applications]
  await database.transaction('rw', tables, async () => {
    await Promise.all(tables.map((table) => table.clear()))
    await database.profiles.bulkAdd(profiles)
    await database.postings.bulkAdd(postings)
    await database.analyses.bulkAdd(analyses)
    await database.applications.bulkAdd(applications)
  })
}

/** Deletes everything, including the AI cache. */
export async function clearAllData(database: JobFitDb = defaultDb): Promise<void> {
  await database.transaction('rw', database.tables, async () => {
    await Promise.all(database.tables.map((table) => table.clear()))
  })
}

function describeBackupError(parsed: unknown): string {
  const header = z.object({ format: z.unknown(), version: z.unknown() }).safeParse(parsed)
  if (!header.success || header.data.format !== BACKUP_FORMAT) {
    return 'Súbor nie je záloha z aplikácie JobFit.'
  }
  if (header.data.version !== BACKUP_VERSION) {
    return `Nepodporovaná verzia zálohy (${String(header.data.version)}).`
  }
  return 'Záloha je poškodená alebo neúplná.'
}
