import type { ApplicationStatus } from '../db/schema'

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Uložené',
  applied: 'Poslané',
  interview: 'Pohovor',
  offer: 'Ponuka',
  rejected: 'Zamietnuté',
  no_response: 'Bez odpovede',
}

export const STATUS_BADGE: Record<ApplicationStatus, string> = {
  saved: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  applied: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200',
  interview: 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200',
  offer: 'bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200',
  rejected: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
  no_response: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
}

/** Formats YYYY-MM-DD for display, e.g. 22. 10. 2026. */
export function formatDate(isoDate: string | null): string {
  if (!isoDate) return '–'
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('sk')
}
