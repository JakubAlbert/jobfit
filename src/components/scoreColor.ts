/** Text color class for a match score: green from 70, amber from 40, red below. */
export function scoreColor(score: number | null): string {
  if (score === null) return 'text-slate-500'
  if (score >= 70) return 'text-green-700 dark:text-green-400'
  if (score >= 40) return 'text-amber-700 dark:text-amber-400'
  return 'text-red-700 dark:text-red-400'
}
