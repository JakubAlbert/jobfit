import { db as defaultDb, type JobFitDb } from '../db/db'
import type { SkillSynonym } from '../db/schema'
import { addUnique } from './cv'
import { setCustomSynonyms } from './skills'

// The user's own skill synonyms: stored in the database (so they are part of backups) and
// handed to the matcher, which checks them before the built-in dictionary.

/** Reads the synonyms from the database and makes the matcher use them. Call after any change. */
export async function loadCustomSynonyms(database: JobFitDb = defaultDb): Promise<SkillSynonym[]> {
  const synonyms = await database.synonyms.toArray()
  setCustomSynonyms(synonyms)
  return synonyms
}

/** Parses the form input ("MS SQL, MSSQL") into a synonym, or null when something is missing. */
export function synonymFromInput(canonical: string, aliasesText: string): SkillSynonym | null {
  const name = canonical.trim()
  const aliases = addUnique([], aliasesText).filter((alias) => alias.toLowerCase() !== name.toLowerCase())
  if (!name || aliases.length === 0) return null
  return { id: crypto.randomUUID(), canonical: name, aliases }
}
