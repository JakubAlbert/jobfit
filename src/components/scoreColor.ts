/** Text color class for a match score: mint from 70, peach from 40, rose below. */
export function scoreColor(score: number | null): string {
  if (score === null) return 'text-muted'
  if (score >= 70) return 'text-offer-ink'
  if (score >= 40) return 'text-peach-ink'
  return 'text-rejected-ink'
}

/** Background + text classes for a score shown as a chip. */
export function scoreChip(score: number | null): string {
  if (score === null) return 'bg-sunken text-muted'
  if (score >= 70) return 'bg-offer text-offer-ink'
  if (score >= 40) return 'bg-peach text-peach-ink'
  return 'bg-rejected text-rejected-ink'
}
