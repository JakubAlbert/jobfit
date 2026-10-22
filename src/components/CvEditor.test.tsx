import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EMPTY_CV } from '../lib/cv'
import { CvEditor } from './CvEditor'

// Smoke test without a DOM: the editor shows every part of the CV.
describe('CvEditor', () => {
  it('renders skills, entries and empty states', () => {
    const html = renderToString(
      <CvEditor
        value={{
          ...EMPTY_CV,
          skills: ['React', 'TypeScript'],
          experience: [{ position: 'Frontend Developer', company: 'Acme', period: '2021', description: 'UI' }],
        }}
        onChange={() => {}}
      />,
    )

    expect(html).toContain('React')
    expect(html).toContain('Odstrániť TypeScript')
    expect(html).toContain('value="Frontend Developer"')
    expect(html).toContain('Zatiaľ nič.') // education, languages and certificates are empty
  })
})
