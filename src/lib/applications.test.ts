import { describe, expect, it } from 'vitest'
import type { Application } from '../db/schema'
import {
  addDays,
  changeStatus,
  computeStats,
  daysBetween,
  dueFollowUps,
  filterApplications,
  newApplication,
  sortApplications,
  toIsoDate,
} from './applications'

const TODAY = '2026-10-22'

function app(overrides: Partial<Application> = {}): Application {
  return { ...newApplication({ company: 'Acme', position: 'Developer' }), ...overrides }
}

describe('dates', () => {
  it('formats the local calendar date', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-28', 7)).toBe('2026-11-04')
    expect(addDays('2026-12-30', 7)).toBe('2027-01-06')
  })

  it('counts days between dates, also across a DST change', () => {
    expect(daysBetween('2026-10-20', '2026-10-27')).toBe(7)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
  })
})

describe('newApplication', () => {
  it('starts as saved, without dates, trimmed', () => {
    const created = newApplication({ company: ' Acme ', position: 'Dev', postingId: 'p1' })
    expect(created).toMatchObject({ company: 'Acme', status: 'saved', postingId: 'p1', appliedDate: null })
  })
})

describe('changeStatus', () => {
  it('sets the sent date and a follow-up in 7 days when applying', () => {
    expect(changeStatus(app(), 'applied', TODAY)).toMatchObject({
      status: 'applied',
      appliedDate: TODAY,
      followUpDate: '2026-10-29',
    })
  })

  it('never overwrites dates the user entered', () => {
    const result = changeStatus(app({ appliedDate: '2026-10-01', followUpDate: '2026-10-05' }), 'applied', TODAY)
    expect(result).toMatchObject({ appliedDate: '2026-10-01', followUpDate: '2026-10-05' })
  })

  it('sets the response date when the company replies and keeps the follow-up for an interview', () => {
    const applied = changeStatus(app(), 'applied', '2026-10-15')
    expect(changeStatus(applied, 'interview', TODAY)).toMatchObject({
      responseDate: TODAY,
      followUpDate: '2026-10-22',
    })
  })

  it.each(['offer', 'rejected', 'no_response'] as const)('clears the follow-up when closed as %s', (status) => {
    const applied = changeStatus(app(), 'applied', '2026-10-15')
    expect(changeStatus(applied, status, TODAY).followUpDate).toBeNull()
  })

  it('does not set a response date for no response', () => {
    expect(changeStatus(app(), 'no_response', TODAY).responseDate).toBeNull()
  })

  it('allows going back, e.g. from no response to interview', () => {
    const result = changeStatus(app({ status: 'no_response', appliedDate: '2026-09-01' }), 'interview', TODAY)
    expect(result).toMatchObject({ status: 'interview', responseDate: TODAY })
  })
})

describe('dueFollowUps', () => {
  it('returns active applications due today or earlier, oldest first', () => {
    const apps = [
      app({ id: 'future', status: 'applied', followUpDate: '2026-10-23' }),
      app({ id: 'today', status: 'interview', followUpDate: TODAY }),
      app({ id: 'overdue', status: 'applied', followUpDate: '2026-10-01' }),
      app({ id: 'closed', status: 'rejected', followUpDate: '2026-10-01' }),
      app({ id: 'saved', status: 'saved', followUpDate: '2026-10-01' }),
      app({ id: 'none', status: 'applied', followUpDate: null }),
    ]
    expect(dueFollowUps(apps, TODAY).map((a) => a.id)).toEqual(['overdue', 'today'])
  })
})

describe('computeStats', () => {
  it('returns null rates instead of 0 when there is nothing to compute from', () => {
    expect(computeStats([])).toEqual({
      total: 0,
      sent: 0,
      responded: 0,
      responseRate: null,
      averageDaysToResponse: null,
    })
    expect(computeStats([app()]).responseRate).toBeNull()
  })

  it('computes response rate from sent applications only and the average time to response', () => {
    const apps = [
      app({ status: 'saved' }),
      app({ status: 'applied', appliedDate: '2026-10-01' }),
      app({ status: 'no_response', appliedDate: '2026-09-01' }),
      app({ status: 'interview', appliedDate: '2026-10-01', responseDate: '2026-10-08' }), // 7 days
      app({ status: 'rejected', appliedDate: '2026-10-01', responseDate: '2026-10-04' }), // 3 days
    ]
    expect(computeStats(apps)).toEqual({
      total: 5,
      sent: 4,
      responded: 2,
      responseRate: 50,
      averageDaysToResponse: 5,
    })
  })

  it('ignores a response date before the sent date (a typo) in the average', () => {
    const apps = [
      app({ status: 'interview', appliedDate: '2026-10-10', responseDate: '2026-10-01' }),
      app({ status: 'interview', appliedDate: '2026-10-01', responseDate: '2026-10-03' }),
    ]
    expect(computeStats(apps).averageDaysToResponse).toBe(2)
  })
})

describe('filterApplications', () => {
  const apps = [
    app({ id: '1', company: 'Účtovná firma', status: 'applied' }),
    app({ id: '2', company: 'Acme', position: 'Frontend', status: 'saved', notes: 'odporúčal Peter' }),
  ]

  it('filters by status', () => {
    expect(filterApplications(apps, { status: 'applied', query: '' }).map((a) => a.id)).toEqual(['1'])
  })

  it('searches company, position and notes ignoring case and diacritics', () => {
    expect(filterApplications(apps, { status: 'all', query: 'uctovna' }).map((a) => a.id)).toEqual(['1'])
    expect(filterApplications(apps, { status: 'all', query: 'PETER' }).map((a) => a.id)).toEqual(['2'])
  })
})

describe('sortApplications', () => {
  const apps = [
    app({ id: 'b', company: 'Beta', status: 'interview', appliedDate: '2026-10-05' }),
    app({ id: 'none', company: 'Čierna', status: 'saved', appliedDate: null }),
    app({ id: 'a', company: 'Alfa', status: 'applied', appliedDate: '2026-10-01' }),
  ]
  const ids = (list: Application[]) => list.map((a) => a.id)

  it('sorts text with Slovak collation', () => {
    expect(ids(sortApplications(apps, 'company', 'asc'))).toEqual(['a', 'b', 'none'])
  })

  it('sorts statuses in pipeline order', () => {
    expect(ids(sortApplications(apps, 'status', 'asc'))).toEqual(['none', 'a', 'b'])
  })

  it('keeps empty values last in both directions', () => {
    expect(ids(sortApplications(apps, 'appliedDate', 'asc'))).toEqual(['a', 'b', 'none'])
    expect(ids(sortApplications(apps, 'appliedDate', 'desc'))).toEqual(['b', 'a', 'none'])
  })

  it('does not modify the original array', () => {
    sortApplications(apps, 'company', 'desc')
    expect(ids(apps)).toEqual(['b', 'none', 'a'])
  })
})
