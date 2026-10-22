import { describe, expect, it } from 'vitest'
import { NEW_ID, parseHash, toHash, type Route } from './router'

describe('router', () => {
  it.each<[string, Route]>([
    ['', { page: 'home' }],
    ['#/', { page: 'home' }],
    ['#/ziadosti', { page: 'applications' }],
    ['#/ziadosti/abc-123', { page: 'applications', id: 'abc-123' }],
    ['#/ziadosti/nova', { page: 'applications', id: NEW_ID }],
    ['#/inzeraty/novy', { page: 'postings', id: NEW_ID }],
    ['#/profil', { page: 'profile' }],
    ['#/nastavenia', { page: 'settings' }],
  ])('parses %s', (hash, route) => {
    expect(parseHash(hash)).toEqual(route)
  })

  it('falls back to the overview for unknown addresses', () => {
    expect(parseHash('#/neexistuje/5')).toEqual({ page: 'home' })
  })

  it('round-trips routes, including ids that need encoding', () => {
    const routes: Route[] = [
      { page: 'home' },
      { page: 'postings', id: 'demo-posting-frontend' },
      { page: 'postings', id: NEW_ID },
      { page: 'applications', id: 'a b/c' },
    ]
    for (const route of routes) expect(parseHash(toHash(route))).toEqual(route)
  })
})
