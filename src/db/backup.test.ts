import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearAllData, exportData, importData, ImportError } from './backup'
import { JobFitDb } from './db'
import type { Application, Profile } from './schema'

const NOW = '2026-10-22T10:00:00.000Z'

const profile: Profile = {
  id: 'profile-1',
  rawText: 'CV text',
  fullName: 'Ján Kováč',
  address: 'Hlavná 12, 811 01 Bratislava',
  cv: {
    skills: ['TypeScript', 'React'],
    experience: [{ position: 'Developer', company: 'Acme', period: '2022–2026', description: 'Web apps' }],
    education: [],
    languages: [{ language: 'English', level: 'C1' }],
    certificates: [],
  },
  updatedAt: NOW,
}

const application: Application = {
  id: 'app-1',
  company: 'Acme',
  position: 'Frontend Developer',
  postingId: null,
  status: 'applied',
  appliedDate: '2026-10-20',
  responseDate: null,
  followUpDate: '2026-10-27',
  interviewAt: null,
  history: [{ status: 'applied', date: '2026-10-20' }],
  notes: '',
  createdAt: NOW,
  updatedAt: NOW,
}

let db: JobFitDb

beforeEach(async () => {
  db = new JobFitDb(`test-${crypto.randomUUID()}`)
  await db.profiles.add(profile)
  await db.applications.add(application)
})

afterEach(async () => {
  await db.delete()
})

describe('exportData / importData', () => {
  it('round-trips all data through JSON', async () => {
    const json = JSON.stringify(await exportData(db))

    const target = new JobFitDb(`test-${crypto.randomUUID()}`)
    await importData(json, target)

    expect(await target.profiles.toArray()).toEqual([profile])
    expect(await target.applications.toArray()).toEqual([application])
    await target.delete()
  })

  it('replaces existing data instead of merging', async () => {
    const backup = await exportData(db)
    await db.applications.add({ ...application, id: 'app-2' })

    await importData(JSON.stringify(backup), db)

    expect(await db.applications.toArray()).toEqual([application])
  })

  it('imports a backup made before profiles had fullName and address', async () => {
    const backup = await exportData(db)
    const { fullName: _name, address: _address, ...oldProfile } = profile
    const oldBackup = { ...backup, data: { ...backup.data, profiles: [oldProfile] } }

    await importData(JSON.stringify(oldBackup), db)

    expect(await db.profiles.toArray()).toEqual([{ ...oldProfile, fullName: '', address: '' }])
  })

  it('imports a backup made before applications had history and interview time', async () => {
    const backup = await exportData(db)
    const { history: _history, interviewAt: _interviewAt, ...oldApplication } = application
    const oldBackup = { ...backup, data: { ...backup.data, applications: [oldApplication] } }

    await importData(JSON.stringify(oldBackup), db)

    expect(await db.applications.toArray()).toEqual([{ ...oldApplication, history: [], interviewAt: null }])
  })

  it('does not export the AI cache', async () => {
    await db.aiCache.add({ hash: 'abc', value: { any: 'thing' }, createdAt: NOW })

    const backup = await exportData(db)

    expect(Object.keys(backup.data)).not.toContain('aiCache')
  })
})

describe('importData validation', () => {
  async function expectRejectedAndUntouched(json: string, message: string) {
    const error = await importData(json, db).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ImportError)
    expect((error as ImportError).message).toBe(message)
    expect(await db.applications.toArray()).toEqual([application])
  }

  it('rejects text that is not JSON', async () => {
    await expectRejectedAndUntouched('not json', 'Súbor nie je platný JSON.')
  })

  it('rejects JSON that is not a JobFit backup', async () => {
    await expectRejectedAndUntouched('{"hello": 1}', 'Súbor nie je záloha z aplikácie JobFit.')
  })

  it('rejects an unsupported backup version', async () => {
    const backup = { ...(await exportData(db)), version: 99 }
    await expectRejectedAndUntouched(JSON.stringify(backup), 'Nepodporovaná verzia zálohy (99).')
  })

  it('rejects a backup with an invalid record and keeps existing data', async () => {
    const backup = await exportData(db)
    const broken = {
      ...backup,
      data: { ...backup.data, applications: [{ ...application, status: 'unknown-status' }] },
    }
    await expectRejectedAndUntouched(JSON.stringify(broken), 'Záloha je poškodená alebo neúplná.')
  })
})

describe('clearAllData', () => {
  it('empties every table including the AI cache', async () => {
    await db.aiCache.add({ hash: 'abc', value: null, createdAt: NOW })

    await clearAllData(db)

    const counts = await Promise.all(db.tables.map((table) => table.count()))
    expect(counts.every((count) => count === 0)).toBe(true)
  })
})
