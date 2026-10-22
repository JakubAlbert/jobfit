import { describe, expect, it } from 'vitest'
import { nextOnboardingStep, onboardingSteps } from './onboarding'

describe('onboarding', () => {
  it('starts with the API key', () => {
    const steps = onboardingSteps({ hasApiKey: false, hasProfile: false, postingCount: 0 })
    expect(nextOnboardingStep(steps)).toMatchObject({ number: 1, target: 'settings' })
  })

  it('moves on to the first unfinished step, even if a later one is done', () => {
    const steps = onboardingSteps({ hasApiKey: true, hasProfile: false, postingCount: 2 })
    expect(nextOnboardingStep(steps)).toMatchObject({ number: 2, target: 'profile' })
  })

  it('is finished when all steps are done', () => {
    expect(nextOnboardingStep(onboardingSteps({ hasApiKey: true, hasProfile: true, postingCount: 1 }))).toBeNull()
  })
})
