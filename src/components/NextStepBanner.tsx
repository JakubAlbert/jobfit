import { useEffect, useState } from 'react'
import { db, PROFILE_ID } from '../db/db'
import {
  dismissOnboarding,
  isOnboardingDismissed,
  nextOnboardingStep,
  onboardingSteps,
  onOnboardingProgress,
  type OnboardingTarget,
} from '../lib/onboarding'
import { loadSettings } from '../lib/settings'

type NextStep = ReturnType<typeof nextOnboardingStep>

interface NextStepBannerProps {
  /** The page currently shown; the banner does not link to the page the user is already on. */
  page: string
  onNavigate: (target: OnboardingTarget) => void
}

/** Thin bar guiding through the first steps on every page except the overview, which has its own checklist. */
export function NextStepBanner({ page, onNavigate }: NextStepBannerProps) {
  const [next, setNext] = useState<NextStep>(null)
  const [dismissed, setDismissed] = useState(isOnboardingDismissed)

  useEffect(() => {
    const check = () =>
      Promise.all([db.profiles.get(PROFILE_ID), db.postings.count()])
        .then(([profile, postingCount]) =>
          nextOnboardingStep(
            onboardingSteps({ hasApiKey: Boolean(loadSettings().apiKey), hasProfile: Boolean(profile), postingCount }),
          ),
        )
        .then(setNext)
        .catch(() => setNext(null))
    check()
    return onOnboardingProgress(check)
  }, [page])

  if (!next || dismissed || page === 'home') return null

  return (
    <div className="bg-accent-soft text-sm text-accent-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
        <span>
          Krok {next.number} z 3: <strong>{next.text}</strong>
        </span>
        {page !== next.target && (
          <button type="button" onClick={() => onNavigate(next.target)} className="font-medium underline">
            Prejsť
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            dismissOnboarding()
            setDismissed(true)
          }}
          className="ml-auto font-semibold opacity-70 hover:underline hover:opacity-100"
        >
          Skryť
        </button>
      </div>
    </div>
  )
}
