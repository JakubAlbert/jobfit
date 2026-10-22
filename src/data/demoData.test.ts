import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { BackupSchema, importData } from '../db/backup'
import { JobFitDb } from '../db/db'
import { computeStats, dueFollowUps } from '../lib/applications'
import { computeMatch } from '../lib/matchScore'
import { filterRewrites } from '../lib/posting'
import { buildDemoBackup } from './demoData'

const TODAY = '2026-10-22'
const demo = buildDemoBackup(TODAY, new Date('2026-10-22T10:00:00Z'))
const { profiles, postings, analyses, applications } = demo.data
const cv = profiles[0].cv

describe('demo data', () => {
  it('is a valid backup and imports cleanly', async () => {
    expect(BackupSchema.safeParse(demo).success).toBe(true)

    const db = new JobFitDb(`test-${crypto.randomUUID()}`)
    await importData(JSON.stringify(demo), db)
    expect(await db.applications.count()).toBe(applications.length)
    await db.delete()
  })

  it('shows a high, a medium and a zero match', () => {
    const scores = postings.map((posting) => computeMatch(cv.skills, posting.requirements!).score)
    expect(scores).toEqual([78, 40, 0])
  })

  it('stores the same score snapshot as the code computes', () => {
    const posting = postings.find((p) => p.id === analyses[0].postingId)!
    expect(analyses[0].score).toBe(computeMatch(cv.skills, posting.requirements!).score)
  })

  it('has sample rewrites that pass the invented-content guard', () => {
    expect(filterRewrites(analyses[0].insights!, cv).droppedRewrites).toBe(0)
  })

  it('has one follow-up due today and realistic statistics', () => {
    expect(dueFollowUps(applications, TODAY).map((app) => app.company)).toEqual(['Demo Soft a.s.'])
    expect(computeStats(applications)).toMatchObject({ total: 5, sent: 4, responseRate: 50, averageDaysToResponse: 7 })
  })

  it('links applications only to existing postings', () => {
    const ids = new Set(postings.map((posting) => posting.id))
    for (const app of applications) {
      if (app.postingId) expect(ids.has(app.postingId)).toBe(true)
    }
  })
})
