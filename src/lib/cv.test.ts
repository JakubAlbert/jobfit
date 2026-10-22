import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CvData } from '../db/schema'
import { addUnique, cleanCv, EMPTY_CV, parseCv } from './cv'
import { generateStructured } from './gemini'

vi.mock('./gemini', () => ({ generateStructured: vi.fn() }))
const generate = vi.mocked(generateStructured)

const config = { apiKey: 'k', model: 'm' }

beforeEach(() => {
  generate.mockReset()
})

describe('parseCv', () => {
  it('sends only anonymized text to the API', async () => {
    generate.mockResolvedValueOnce(EMPTY_CV)

    await parseCv(
      config,
      'Ján Kováč\njan@kovac.sk, +421 905 123 456\nHlavná 12, 811 01 Bratislava\nReact developer',
      { fullName: 'Ján Kováč', address: 'Hlavná 12, 811 01 Bratislava' },
    )

    const { prompt } = generate.mock.calls[0][1]
    expect(prompt).toContain('[MENO]')
    expect(prompt).toContain('React developer')
    for (const secret of ['Ján', 'Kováč', 'jan@kovac.sk', '905 123 456', 'Hlavná 12', '811 01']) {
      expect(prompt).not.toContain(secret)
    }
  })

  it('returns cleaned data', async () => {
    generate.mockResolvedValueOnce({ ...EMPTY_CV, skills: [' React ', 'react', 'TypeScript'] })

    const cv = await parseCv(config, 'CV', { fullName: '', address: '' })

    expect(cv.skills).toEqual(['React', 'TypeScript'])
  })
})

describe('cleanCv', () => {
  it('trims fields and drops empty entries', () => {
    const cv: CvData = {
      ...EMPTY_CV,
      experience: [
        { position: ' Dev ', company: 'Acme', period: '2020', description: '' },
        { position: ' ', company: '', period: '', description: '' },
      ],
      languages: [{ language: 'English', level: ' C1 ' }],
      certificates: ['AWS', 'aws', ''],
    }

    expect(cleanCv(cv)).toEqual({
      ...EMPTY_CV,
      experience: [{ position: 'Dev', company: 'Acme', period: '2020', description: '' }],
      languages: [{ language: 'English', level: 'C1' }],
      certificates: ['AWS'],
    })
  })
})

describe('addUnique', () => {
  it('splits comma-separated input and skips duplicates ignoring case', () => {
    expect(addUnique(['React'], 'react, Vue , ,TypeScript')).toEqual(['React', 'Vue', 'TypeScript'])
  })

  it('does not modify the original list', () => {
    const list = ['A']
    addUnique(list, 'B')
    expect(list).toEqual(['A'])
  })
})
