import type { ReactNode } from 'react'

// Small shared UI building blocks and class names, so pages look consistent.
// Colours come from the semantic tokens in index.css, which switch for dark mode by themselves.

export type Feedback = { tone: 'info' | 'success' | 'error'; text: string } | null

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-5 ring-1 ring-line sm:p-7">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** Page title with an optional line of context and actions on the right. */
export function PageHeader({ title, lead, actions }: { title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
        {lead && <p className="mt-2 max-w-prose text-muted">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  const tones = {
    info: 'bg-sunken text-ink',
    success: 'bg-offer text-offer-ink',
    error: 'bg-rejected text-rejected-ink',
  }
  return (
    <p
      role={feedback.tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl px-4 py-2.5 text-sm ${tones[feedback.tone]}`}
    >
      {feedback.text}
    </p>
  )
}

/** Placeholder for an empty list: says what is missing and what to do. */
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>
    </div>
  )
}

export const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 transition-colors hover:border-accent/40 focus:border-accent'
export const labelClass = 'block text-sm font-semibold'
export const hintClass = 'text-sm text-muted'
export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50'
export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent-ink transition-colors hover:ring-1 hover:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50'
export const dangerButton =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-rejected-ink ring-1 ring-rejected-ink/30 transition-colors hover:bg-rejected'
export const linkClass = 'font-semibold text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent'
