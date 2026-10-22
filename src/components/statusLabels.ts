import type { ApplicationStatus } from '../db/schema'

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Uložené',
  applied: 'Poslané',
  interview: 'Pohovor',
  offer: 'Ponuka',
  rejected: 'Zamietnuté',
  no_response: 'Bez odpovede',
}

// Every status has its own pastel, used the same way everywhere (badges, kanban tabs), so the colour
// alone tells where an application stands. Full class names, so Tailwind can find them in the source.
export const STATUS_BADGE: Record<ApplicationStatus, string> = {
  saved: 'bg-saved text-saved-ink',
  applied: 'bg-applied text-applied-ink',
  interview: 'bg-interview text-interview-ink',
  offer: 'bg-offer text-offer-ink',
  rejected: 'bg-rejected text-rejected-ink',
  no_response: 'bg-no-response text-no-response-ink',
}

/** Solid status colour for thin bars; pastels on a dark background are too faint there, so dark mode uses the ink tone. */
export const STATUS_BAR: Record<ApplicationStatus, string> = {
  saved: 'bg-saved dark:bg-saved-ink/70',
  applied: 'bg-applied dark:bg-applied-ink/70',
  interview: 'bg-interview dark:bg-interview-ink/70',
  offer: 'bg-offer dark:bg-offer-ink/70',
  rejected: 'bg-rejected dark:bg-rejected-ink/70',
  no_response: 'bg-no-response dark:bg-no-response-ink/60',
}

/** Lighter wash of the status colour, for a whole kanban column. */
export const STATUS_WASH: Record<ApplicationStatus, string> = {
  saved: 'bg-saved/35',
  applied: 'bg-applied/35',
  interview: 'bg-interview/35',
  offer: 'bg-offer/35',
  rejected: 'bg-rejected/35',
  no_response: 'bg-no-response/45',
}

/** Formats YYYY-MM-DD for display, e.g. 22. 10. 2026, with non-breaking spaces so a date never wraps. */
export function formatDate(isoDate: string | null): string {
  if (!isoDate) return '–'
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('sk').replaceAll(' ', '\u00a0')
}
