import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { JobFitDb } from '../db/db'
import { computeMatch } from './matchScore'
import { canonicalSkill, setCustomSynonyms } from './skills'
import { loadCustomSynonyms, synonymFromInput } from './synonyms'

afterEach(() => {
  // The matcher keeps synonyms in module state; reset it so tests stay independent.
  setCustomSynonyms([])
})

describe('custom synonyms in matching', () => {
  it('match skills the built-in dictionary does not know', () => {
    const requirements = { mustHaveSkills: ['Účtovníctvo'], niceToHaveSkills: [] }
    expect(computeMatch(['Pohoda'], requirements).score).toBe(0)

    setCustomSynonyms([{ canonical: 'Účtovníctvo', aliases: ['Pohoda', 'Money S3'] }])

    expect(computeMatch(['Pohoda'], requirements).score).toBe(100)
  })

  it('take precedence over the built-in dictionary', () => {
    expect(canonicalSkill('MSSQL').label).toBe('Microsoft SQL Server')
    setCustomSynonyms([{ canonical: 'SQL Server', aliases: ['MSSQL'] }])
    expect(canonicalSkill('MSSQL').label).toBe('SQL Server')
  })
})

describe('synonymFromInput', () => {
  it('splits aliases, trims and drops duplicates and the name itself', () => {
    expect(synonymFromInput(' SQL Server ', 'MS SQL, mssql ,MSSQL, sql server')).toMatchObject({
      canonical: 'SQL Server',
      aliases: ['MS SQL', 'mssql'],
    })
  })

  it('needs a name and at least one alias', () => {
    expect(synonymFromInput('', 'a')).toBeNull()
    expect(synonymFromInput('SQL', ' , ')).toBeNull()
  })
})

describe('loadCustomSynonyms', () => {
  it('reads the database and applies the synonyms', async () => {
    const db = new JobFitDb(`test-${crypto.randomUUID()}`)
    await db.synonyms.add({ id: 's1', canonical: 'Účtovníctvo', aliases: ['Pohoda'] })

    await loadCustomSynonyms(db)

    expect(canonicalSkill('pohoda').label).toBe('Účtovníctvo')
    await db.delete()
  })
})
