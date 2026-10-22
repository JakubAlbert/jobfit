import { describe, expect, it } from 'vitest'
import { PROFILE_ID } from '../db/db'
import type { Profile } from '../db/schema'
import { EMPTY_CV } from './cv'
import { newProfileVersion, profileForPosting, sortProfiles } from './profiles'

const profile = (id: string, name: string): Profile => ({
  id,
  name,
  rawText: '',
  fullName: '',
  address: '',
  cv: EMPTY_CV,
  updatedAt: '2026-10-22T10:00:00.000Z',
})

const main = profile(PROFILE_ID, 'Hlavné CV')
const frontend = profile('v-frontend', 'Frontend')

describe('profileForPosting', () => {
  it('uses the version chosen for the posting', () => {
    expect(profileForPosting([main, frontend], { profileId: 'v-frontend' })).toBe(frontend)
  })

  it('falls back to the main CV when none is chosen or the version was deleted', () => {
    expect(profileForPosting([main, frontend], { profileId: null })).toBe(main)
    expect(profileForPosting([main], { profileId: 'deleted' })).toBe(main)
  })

  it('returns null without any profile', () => {
    expect(profileForPosting([], { profileId: null })).toBeNull()
  })
})

describe('sortProfiles', () => {
  it('puts the main CV first and the rest by name', () => {
    const others = [profile('b', 'Zber dát'), profile('a', 'Analytik')]
    expect(sortProfiles([...others, main]).map((p) => p.name)).toEqual(['Hlavné CV', 'Analytik', 'Zber dát'])
  })
})

describe('newProfileVersion', () => {
  it('copies the CV under a new id and the next free name', () => {
    const copy = newProfileVersion(main, [main, profile('x', 'Verzia 2')])
    expect(copy.id).not.toBe(PROFILE_ID)
    expect(copy.name).toBe('Verzia 3')
    expect(copy.cv).toEqual(main.cv)
  })
})
