import { describe, expect, it } from 'vitest'
import { newApplication } from './applications'
import { applicationEvents, buildIcs, escapeText, foldLine } from './calendar'

const NOW = new Date('2026-10-22T08:30:15.123Z')
const lines = (ics: string) => ics.split('\r\n')

describe('buildIcs', () => {
  it('writes an all-day event that ends the next day', () => {
    const ics = buildIcs([{ uid: 'a', title: 'Follow-up', description: 'x', date: '2026-10-31' }], NOW)
    expect(lines(ics)).toEqual(
      expect.arrayContaining([
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'UID:a@jobfit',
        'DTSTAMP:20261022T083015Z',
        'DTSTART;VALUE=DATE:20261031',
        'DTEND;VALUE=DATE:20261101',
        'END:VCALENDAR',
      ]),
    )
    expect(ics.endsWith('\r\n')).toBe(true)
  })

  it('writes a timed event in local time with its duration', () => {
    const ics = buildIcs(
      [{ uid: 'b', title: 'Pohovor', description: '', dateTime: '2026-10-24T23:30', durationMinutes: 60 }],
      NOW,
    )
    expect(lines(ics)).toEqual(expect.arrayContaining(['DTSTART:20261024T233000', 'DTEND:20261025T003000']))
  })
})

describe('escapeText', () => {
  it('escapes characters with a meaning in the format', () => {
    expect(escapeText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne')
  })
})

describe('foldLine', () => {
  it('keeps short lines', () => {
    expect(foldLine('SUMMARY:Krátky')).toBe('SUMMARY:Krátky')
  })

  it('folds long lines at 75 bytes, counting multi-byte characters', () => {
    const folded = foldLine(`DESCRIPTION:${'č'.repeat(60)}`)
    const parts = folded.split('\r\n ')
    expect(parts.length).toBeGreaterThan(1)
    for (const [index, part] of parts.entries()) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(index === 0 ? 75 : 74)
    }
    expect(parts.join('')).toBe(`DESCRIPTION:${'č'.repeat(60)}`)
  })
})

describe('applicationEvents', () => {
  it('creates a follow-up and an interview event when the dates are set', () => {
    const app = {
      ...newApplication({ company: 'Acme', position: 'Frontend' }),
      followUpDate: '2026-10-29',
      interviewAt: '2026-10-24T10:00',
    }
    expect(applicationEvents(app).map((event) => event.title)).toEqual([
      'Follow-up: Acme, Frontend',
      'Pohovor: Acme, Frontend',
    ])
  })

  it('creates nothing without dates', () => {
    expect(applicationEvents(newApplication({ company: 'Acme', position: '' }))).toEqual([])
  })
})
