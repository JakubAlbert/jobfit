import { Dexie, type EntityTable } from 'dexie'
import type { AiCacheEntry, Analysis, Application, JobPosting, Profile } from './schema'

export class JobFitDb extends Dexie {
  profiles!: EntityTable<Profile, 'id'>
  postings!: EntityTable<JobPosting, 'id'>
  analyses!: EntityTable<Analysis, 'id'>
  applications!: EntityTable<Application, 'id'>
  aiCache!: EntityTable<AiCacheEntry, 'hash'>

  // The name is a parameter so tests can use an isolated database each.
  constructor(name = 'jobfit') {
    super(name)
    // First entry is the primary key, the rest are indexes (only fields we query or sort by).
    // Schema changes must add a new version(n) with a migration, never edit this one.
    this.version(1).stores({
      profiles: 'id',
      postings: 'id, createdAt',
      analyses: 'id, postingId, profileId',
      applications: 'id, status, followUpDate, postingId',
      aiCache: 'hash',
    })
  }
}

export const db = new JobFitDb()

/** The app keeps a single profile under this id. */
export const PROFILE_ID = 'me'
