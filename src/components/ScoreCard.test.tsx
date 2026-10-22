import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { computeMatch } from '../lib/matchScore'
import { ScoreCard } from './ScoreCard'

// React separates adjacent text parts with <!-- --> when rendering to a string.
const render = (element: React.ReactElement) => renderToString(element).replaceAll('<!-- -->', '')

describe('ScoreCard', () => {
  it('shows the score, its breakdown and matched/missing skills', () => {
    const match = computeMatch(['React', 'Git'], { mustHaveSkills: ['React', 'TypeScript'], niceToHaveSkills: ['Git'] })
    const html = render(<ScoreCard match={match} />)

    expect(html).toContain('60 %') // (2 + 1) / (4 + 1)
    expect(html).toContain('Povinné: 1 z 2')
    expect(html).toContain('✓ React')
    expect(html).toContain('✗ TypeScript')
  })

  it('explains why there is no score when the posting lists no skills', () => {
    const html = render(<ScoreCard match={computeMatch(['React'], { mustHaveSkills: [], niceToHaveSkills: [] })} />)
    expect(html).toContain('skóre sa nedá vypočítať')
  })
})
