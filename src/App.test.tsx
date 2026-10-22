import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

// Smoke test: renders to a string in Node, so no DOM environment is needed yet.
describe('App', () => {
  it('renders the app name', () => {
    expect(renderToString(<App />)).toContain('JobFit')
  })
})
