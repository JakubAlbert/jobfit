import type { ReactNode } from 'react'

// Small shared UI building blocks and class names, so pages look consistent.

export type Feedback = { tone: 'info' | 'success' | 'error'; text: string } | null

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 p-4 sm:p-6 dark:border-slate-800">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  const tones = {
    info: 'text-slate-700 dark:text-slate-300',
    success: 'text-green-700 dark:text-green-400',
    error: 'text-red-700 dark:text-red-400',
  }
  return (
    <p role={feedback.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${tones[feedback.tone]}`}>
      {feedback.text}
    </p>
  )
}

export const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900'
export const labelClass = 'block text-sm font-medium'
export const hintClass = 'text-sm text-slate-600 dark:text-slate-400'
export const primaryButton =
  'rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300'
export const secondaryButton =
  'rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800'
export const dangerButton =
  'rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950'
