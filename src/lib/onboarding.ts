// First-run guidance: API key → CV → first job posting.

export type OnboardingTarget = 'settings' | 'profile' | 'postings'

export interface OnboardingState {
  hasApiKey: boolean
  hasProfile: boolean
  postingCount: number
}

export interface OnboardingStep {
  text: string
  target: OnboardingTarget
  done: boolean
}

export function onboardingSteps(state: OnboardingState): OnboardingStep[] {
  return [
    { text: 'Zadaj Gemini API kľúč', target: 'settings', done: state.hasApiKey },
    { text: 'Nahraj svoje CV', target: 'profile', done: state.hasProfile },
    { text: 'Vlož prvý inzerát', target: 'postings', done: state.postingCount > 0 },
  ]
}

/** The first unfinished step with its 1-based number, or null when everything is done. */
export function nextOnboardingStep(steps: OnboardingStep[]): (OnboardingStep & { number: number }) | null {
  const index = steps.findIndex((step) => !step.done)
  return index === -1 ? null : { ...steps[index], number: index + 1 }
}

const PROGRESS_EVENT = 'jobfit:progress'

/** Tells the next-step banner to re-check progress (after saving a key, profile or posting). */
export function notifyOnboardingProgress(): void {
  window.dispatchEvent(new Event(PROGRESS_EVENT))
}

export function onOnboardingProgress(callback: () => void): () => void {
  window.addEventListener(PROGRESS_EVENT, callback)
  return () => window.removeEventListener(PROGRESS_EVENT, callback)
}

const DISMISSED_KEY = 'jobfit.onboardingDismissed'

export function isOnboardingDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function dismissOnboarding(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, 'true')
  } catch {
    // Not remembered; the banner comes back next visit.
  }
}
