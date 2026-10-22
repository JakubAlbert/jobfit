import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiInsights, CvData, JobRequirements } from '../db/schema'
import { EMPTY_CV } from './cv'
import { generateStructured } from './gemini'
import { computeMatch } from './matchScore'
import { analyzePosting, filterRewrites, generateCoverLetter, generateInsights } from './posting'

vi.mock('./gemini', () => ({ generateStructured: vi.fn() }))
const generate = vi.mocked(generateStructured)

const config = { apiKey: 'k', model: 'm' }

const cv: CvData = {
  ...EMPTY_CV,
  skills: ['React', 'TypeScript'],
  experience: [
    {
      position: 'Frontend Developer',
      company: 'Acme',
      period: '2021 – 2024',
      description: 'Vyvíjal som interný dashboard v Reacte. Zrýchlil som načítanie stránky o 40 %.',
    },
  ],
}

const requirements: JobRequirements = {
  mustHaveSkills: ['React'],
  niceToHaveSkills: ['AWS'],
  seniority: 'mid',
  location: 'Bratislava',
  workMode: 'hybrid',
  salary: null,
  languages: [],
}

const posting = { title: 'Frontend Developer', company: 'Beta', requirements }

const insights = (rewrites: AiInsights['rewrites']): AiInsights => ({
  strengths: ['React'],
  gaps: [],
  highlights: [],
  rewrites,
})

beforeEach(() => {
  generate.mockReset()
})

describe('analyzePosting', () => {
  it('returns requirements with duplicate skills removed', async () => {
    generate.mockResolvedValueOnce({ ...requirements, mustHaveSkills: ['React', 'react', ' TypeScript '] })

    const result = await analyzePosting(config, 'Hľadáme React developera…')

    expect(result.mustHaveSkills).toEqual(['React', 'TypeScript'])
    expect(generate.mock.calls[0][1].prompt).toContain('Hľadáme React developera…')
  })
})

describe('filterRewrites', () => {
  it('keeps rewrites of text that is in the CV, tolerating case, quotes and punctuation', () => {
    const result = filterRewrites(
      insights([{ original: '„zrýchlil som NAČÍTANIE stránky o 40 %"', suggestion: 'Skrátil som…' }]),
      cv,
    )
    expect(result.insights.rewrites).toHaveLength(1)
    expect(result.droppedRewrites).toBe(0)
  })

  it('drops rewrites of text the CV does not contain', () => {
    const result = filterRewrites(
      insights([
        { original: 'Vyvíjal som interný dashboard v Reacte', suggestion: 'OK' },
        { original: 'Viedol som tím 10 ľudí', suggestion: 'Invented' },
        { original: '', suggestion: 'Empty' },
      ]),
      cv,
    )
    expect(result.insights.rewrites.map((r) => r.suggestion)).toEqual(['OK'])
    expect(result.droppedRewrites).toBe(2)
  })
})

describe('generateInsights', () => {
  it('sends the structured CV and the computed match, and filters invented rewrites', async () => {
    generate.mockResolvedValueOnce(insights([{ original: 'Viedol som tím', suggestion: 'x' }]))
    const match = computeMatch(cv.skills, requirements)

    const result = await generateInsights(config, { cv, posting, match })

    const sent = JSON.parse(generate.mock.calls[0][1].prompt)
    expect(sent.match.score).toBe(match.score)
    expect(sent.cv.experience[0].company).toBe('Acme')
    expect(result.droppedRewrites).toBe(1)
  })
})

describe('generateCoverLetter', () => {
  it('fills in the name locally, after the response', async () => {
    generate.mockResolvedValueOnce({ letter: 'Dobrý deň,\n…\nS pozdravom\n[MENO]' })

    const letter = await generateCoverLetter(config, { cv, posting, language: 'sk', fullName: 'Ján Kováč' })

    expect(letter.endsWith('Ján Kováč')).toBe(true)
    expect(generate.mock.calls[0][1].prompt).not.toContain('Ján Kováč')
    expect(generate.mock.calls[0][1].systemInstruction).toContain('Slovak')
  })
})
