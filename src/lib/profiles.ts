import { PROFILE_ID } from '../db/db'
import type { JobPosting, Profile } from '../db/schema'

// CV versions. The main CV (PROFILE_ID) always exists once a profile is created; extra versions
// ("frontend", "fullstack") are copies tuned for a kind of role. A posting is compared with the
// version chosen for it, or with the main CV.

export const MAIN_PROFILE_NAME = 'Hlavné CV'

/** The CV a posting is compared with: its chosen version, else the main CV. */
export function profileForPosting(profiles: Profile[], posting: Pick<JobPosting, 'profileId'>): Profile | null {
  return (
    profiles.find((profile) => profile.id === posting.profileId) ??
    profiles.find((profile) => profile.id === PROFILE_ID) ??
    null
  )
}

/** Main CV first, the rest by name. */
export function sortProfiles(profiles: Profile[]): Profile[] {
  return [...profiles].sort((a, b) =>
    a.id === PROFILE_ID ? -1 : b.id === PROFILE_ID ? 1 : a.name.localeCompare(b.name, 'sk'),
  )
}

/** A new version copied from an existing CV, with the first free "Verzia N" name. */
export function newProfileVersion(from: Profile, existing: Profile[], now: Date = new Date()): Profile {
  const names = new Set(existing.map((profile) => profile.name))
  let number = existing.length + 1
  while (names.has(`Verzia ${number}`)) number++
  return { ...from, id: crypto.randomUUID(), name: `Verzia ${number}`, updatedAt: now.toISOString() }
}
