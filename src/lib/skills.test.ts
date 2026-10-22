import { describe, expect, it } from 'vitest'
import { SKILL_SYNONYMS } from '../data/skillSynonyms'
import { canonicalSkill, canonicalSkills, normalizeSkill } from './skills'

describe('normalizeSkill', () => {
  it('lowercases, strips diacritics and tidies whitespace and punctuation', () => {
    expect(normalizeSkill('  Agilné   Riadenie. ')).toBe('agilne riadenie')
  })
})

describe('canonicalSkill', () => {
  it.each([
    ['JS', 'JavaScript'],
    ['javascript', 'JavaScript'],
    ['Postgres', 'PostgreSQL'],
    ['k8s', 'Kubernetes'],
    ['ReactJS', 'React'],
    ['React.js', 'React'],
    ['Node JS', 'Node.js'],
    ['nodejs', 'Node.js'],
    ['GCP', 'Google Cloud'],
    ['MS Excel', 'Excel'],
    ['C#', 'C#'],
    ['.NET Core', '.NET'],
  ])('maps %s to %s', (input, label) => {
    expect(canonicalSkill(input).label).toBe(label)
  })

  it('ignores version numbers', () => {
    expect(canonicalSkill('React 18').label).toBe('React')
    expect(canonicalSkill('Python 3.12').label).toBe('Python')
    expect(canonicalSkill('Java 17+').key).toBe(canonicalSkill('Java').key)
  })

  it('keeps names that end with a number when they are in the dictionary', () => {
    expect(canonicalSkill('Office 365').label).toBe('Microsoft Office')
  })

  it('does not merge similar but different skills', () => {
    expect(canonicalSkill('Java').key).not.toBe(canonicalSkill('JavaScript').key)
    expect(canonicalSkill('C').key).not.toBe(canonicalSkill('C++').key)
    expect(canonicalSkill('React').key).not.toBe(canonicalSkill('React Native').key)
  })

  it('keeps unknown skills as written, compared case- and diacritics-insensitively', () => {
    expect(canonicalSkill(' Účtovníctvo ')).toEqual({ key: 'uctovnictvo', label: 'Účtovníctvo' })
    expect(canonicalSkill('UCTOVNICTVO').key).toBe('uctovnictvo')
  })
})

describe('canonicalSkills', () => {
  it('removes duplicates and empty entries', () => {
    expect(canonicalSkills(['JS', 'JavaScript', '', ' ', 'TS']).map((s) => s.label)).toEqual([
      'JavaScript',
      'TypeScript',
    ])
  })
})

describe('synonym dictionary', () => {
  it('never maps one alias to two different skills', () => {
    const owner = new Map<string, string>()
    for (const [canonical, aliases] of Object.entries(SKILL_SYNONYMS)) {
      for (const name of [canonical, ...aliases]) {
        const key = normalizeSkill(name)
        expect(owner.get(key) ?? canonical, `"${name}" is listed under two skills`).toBe(canonical)
        owner.set(key, canonical)
      }
    }
  })
})
