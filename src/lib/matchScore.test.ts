import { describe, expect, it } from 'vitest'
import { compareLanguages, computeMatch } from './matchScore'

const requirements = (mustHaveSkills: string[], niceToHaveSkills: string[] = []) => ({
  mustHaveSkills,
  niceToHaveSkills,
})

describe('computeMatch', () => {
  it('scores 100 when every skill is in the CV', () => {
    expect(computeMatch(['React', 'TypeScript', 'Docker'], requirements(['React', 'TypeScript'], ['Docker'])).score).toBe(100)
  })

  it('scores 0 when nothing matches', () => {
    expect(computeMatch(['Excel'], requirements(['React'], ['Docker'])).score).toBe(0)
  })

  it('weights must-have skills twice as much as nice-to-have', () => {
    // 2 must-have (max 4 points) + 2 nice-to-have (max 2 points) = 6 points.
    const onlyMustHave = computeMatch(['A', 'B'], requirements(['A', 'B'], ['C', 'D']))
    const onlyNiceToHave = computeMatch(['C', 'D'], requirements(['A', 'B'], ['C', 'D']))
    expect(onlyMustHave.score).toBe(67) // 4 / 6
    expect(onlyNiceToHave.score).toBe(33) // 2 / 6
  })

  it('returns null instead of 0 when the posting lists no skills', () => {
    expect(computeMatch(['React'], requirements([], [])).score).toBeNull()
  })

  it('matches synonyms and versions on both sides', () => {
    const result = computeMatch(['JS', 'Postgres', 'React 18'], requirements(['JavaScript', 'PostgreSQL'], ['ReactJS']))
    expect(result.score).toBe(100)
    expect(result.matchedMustHave).toEqual(['JavaScript', 'PostgreSQL'])
    expect(result.matchedNiceToHave).toEqual(['React'])
  })

  it('lists matched and missing skills per group', () => {
    expect(computeMatch(['React', 'Git'], requirements(['React', 'TypeScript'], ['Git', 'AWS']))).toEqual({
      score: 50, // (2 + 1) / (4 + 2)
      matchedMustHave: ['React'],
      missingMustHave: ['TypeScript'],
      matchedNiceToHave: ['Git'],
      missingNiceToHave: ['AWS'],
    })
  })

  it('counts duplicates once and a skill in both groups as must-have only', () => {
    const result = computeMatch(['React'], requirements(['React', 'react', 'ReactJS'], ['React', 'Vue']))
    expect(result.matchedMustHave).toEqual(['React'])
    expect(result.matchedNiceToHave).toEqual([])
    expect(result.missingNiceToHave).toEqual(['Vue'])
    expect(result.score).toBe(67) // 2 / (2 + 1)
  })
})

describe('compareLanguages', () => {
  it('finds languages written differently in the CV and the posting', () => {
    const cv = [
      { language: 'Angličtina', level: 'C1' },
      { language: 'Slovenčina', level: 'materinský jazyk' },
    ]
    const required = [
      { language: 'English', level: 'B2' },
      { language: 'German', level: 'A2' },
    ]

    expect(compareLanguages(cv, required)).toEqual([
      { language: 'English', requiredLevel: 'B2', cvLevel: 'C1' },
      { language: 'German', requiredLevel: 'A2', cvLevel: null },
    ])
  })
})
