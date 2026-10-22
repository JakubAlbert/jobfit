import { describe, expect, it } from 'vitest'
import type { JobPosting } from '../db/schema'
import { fillSeniorityFromTitle, resolveSeniority, seniorityFromTitle } from './seniority'

describe('seniorityFromTitle', () => {
  it.each([
    ['Senior Backend Developer', 'senior'],
    ['Sr. Java Engineer', 'senior'],
    ['Junior Frontend Developer', 'junior'],
    ['Jr. QA tester', 'junior'],
    ['Medior PHP programátor', 'mid'],
    ['Mid-level Data Analyst', 'mid'],
    ['Team Lead .NET', 'lead'],
    ['Vedúci tímu vývoja', 'lead'],
    ['Stážista – marketing', 'junior'],
    ['Absolvent IT', 'junior'],
  ] as const)('reads %s as %s', (title, level) => {
    expect(seniorityFromTitle(title)).toBe(level)
  })

  it('takes the higher level when several are named', () => {
    expect(seniorityFromTitle('Senior Team Lead')).toBe('lead')
    expect(seniorityFromTitle('Junior/Medior Developer')).toBe('mid')
  })

  it('does not match words that only contain a level', () => {
    expect(seniorityFromTitle('Seniorský opatrovateľ')).toBe('unknown')
    expect(seniorityFromTitle('Midfield analyst')).toBe('unknown')
    expect(seniorityFromTitle('Frontend Developer')).toBe('unknown')
  })
})

describe('fillSeniorityFromTitle', () => {
  const posting = (title: string, seniority: 'unknown' | 'mid' | null): JobPosting => ({
    id: 'p',
    title,
    company: '',
    url: '',
    text: '',
    createdAt: '2026-10-22T10:00:00.000Z',
    requirements:
      seniority === null
        ? null
        : {
            mustHaveSkills: [],
            niceToHaveSkills: [],
            seniority,
            location: null,
            workMode: 'unknown',
            salary: null,
            languages: [],
          },
  })

  it('fills an unknown level from the title', () => {
    expect(fillSeniorityFromTitle(posting('Senior backend', 'unknown'))?.requirements?.seniority).toBe('senior')
  })

  it('leaves a known level, unanalysed postings and titles without a level alone', () => {
    expect(fillSeniorityFromTitle(posting('Senior backend', 'mid'))).toBeNull()
    expect(fillSeniorityFromTitle(posting('Senior backend', null))).toBeNull()
    expect(fillSeniorityFromTitle(posting('Backend developer', 'unknown'))).toBeNull()
  })
})

describe('resolveSeniority', () => {
  it('prefers the level in the title over the one read from the text', () => {
    expect(resolveSeniority('Senior Backend Developer', 'unknown')).toBe('senior')
    expect(resolveSeniority('Senior Backend Developer', 'mid')).toBe('senior')
  })

  it('keeps the level from the text when the title names none', () => {
    expect(resolveSeniority('Backend Developer', 'mid')).toBe('mid')
  })
})
