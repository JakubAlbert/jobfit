import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from '../db/schema'

// Application tracker logic as pure functions. "today" is always a parameter, so behaviour does not
// depend on when the tests run. Dates are plain YYYY-MM-DD strings in local time: no time part means
// no off-by-one-day bugs around midnight UTC.

export const FOLLOW_UP_DAYS = 7

/** Still waiting for the next step; only these need a follow-up. */
export const ACTIVE_STATUSES: readonly ApplicationStatus[] = ['applied', 'interview']
/** The company replied. */
export const RESPONDED_STATUSES: readonly ApplicationStatus[] = ['interview', 'offer', 'rejected']
/** Closed: no follow-up any more. */
export const CLOSED_STATUSES: readonly ApplicationStatus[] = ['offer', 'rejected', 'no_response']

// --- Dates ---

/** Local calendar date as YYYY-MM-DD (not toISOString, which is UTC and can be a different day). */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return toIsoDate(new Date(year, month - 1, day + days))
}

export function daysBetween(from: string, to: string): number {
  const utc = (iso: string) => {
    const [year, month, day] = iso.split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.round((utc(to) - utc(from)) / 86_400_000)
}

// --- Creating and changing applications ---

export function newApplication(
  fields: { company: string; position: string; postingId?: string | null },
  now: Date = new Date(),
): Application {
  const timestamp = now.toISOString()
  return {
    id: crypto.randomUUID(),
    company: fields.company.trim(),
    position: fields.position.trim(),
    postingId: fields.postingId ?? null,
    status: 'saved',
    appliedDate: null,
    responseDate: null,
    followUpDate: null,
    notes: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

/**
 * Moves an application to a new status and fills in dates that are still empty.
 * Any transition is allowed (real processes are not linear). Dates entered by the user are never overwritten.
 */
export function changeStatus(app: Application, status: ApplicationStatus, today: string): Application {
  const next: Application = { ...app, status }
  if (status === 'applied') {
    next.appliedDate ??= today
    next.followUpDate ??= addDays(today, FOLLOW_UP_DAYS)
  }
  if (RESPONDED_STATUSES.includes(status)) {
    next.responseDate ??= today
  }
  if (CLOSED_STATUSES.includes(status)) {
    next.followUpDate = null
  }
  return next
}

// --- Follow-ups ---

/** Active applications whose follow-up date is today or in the past, oldest first. */
export function dueFollowUps(apps: Application[], today: string): Application[] {
  return apps
    .filter((app) => ACTIVE_STATUSES.includes(app.status) && app.followUpDate !== null && app.followUpDate <= today)
    .sort((a, b) => (a.followUpDate ?? '').localeCompare(b.followUpDate ?? ''))
}

// --- Statistics ---

export interface ApplicationStats {
  total: number
  /** Everything except "saved". */
  sent: number
  responded: number
  /** Percentage of sent applications that got a reply; null when nothing was sent yet. */
  responseRate: number | null
  /** Average days from sending to the reply; null when no application has both dates. */
  averageDaysToResponse: number | null
}

export function computeStats(apps: Application[]): ApplicationStats {
  const sent = apps.filter((app) => app.status !== 'saved')
  const responded = sent.filter((app) => RESPONDED_STATUSES.includes(app.status) || app.responseDate !== null)
  const durations = apps
    .filter((app) => app.appliedDate && app.responseDate)
    .map((app) => daysBetween(app.appliedDate as string, app.responseDate as string))
    .filter((days) => days >= 0)

  return {
    total: apps.length,
    sent: sent.length,
    responded: responded.length,
    responseRate: sent.length === 0 ? null : Math.round((100 * responded.length) / sent.length),
    averageDaysToResponse:
      durations.length === 0
        ? null
        : Math.round((10 * durations.reduce((sum, days) => sum + days, 0)) / durations.length) / 10,
  }
}

// --- Table: filtering and sorting ---

export type SortKey = 'company' | 'position' | 'status' | 'appliedDate' | 'followUpDate' | 'updatedAt'
export type SortDirection = 'asc' | 'desc'

export function filterApplications(
  apps: Application[],
  filter: { status: ApplicationStatus | 'all'; query: string },
): Application[] {
  const query = fold(filter.query.trim())
  return apps.filter(
    (app) =>
      (filter.status === 'all' || app.status === filter.status) &&
      (!query || fold(`${app.company} ${app.position} ${app.notes}`).includes(query)),
  )
}

/** Sorts a copy. Empty values always go last, whatever the direction. */
export function sortApplications(apps: Application[], key: SortKey, direction: SortDirection): Application[] {
  const sign = direction === 'asc' ? 1 : -1
  const value = (app: Application): string | number | null =>
    key === 'status' ? APPLICATION_STATUSES.indexOf(app.status) : app[key] || null

  return [...apps].sort((a, b) => {
    const [x, y] = [value(a), value(b)]
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
    const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'sk')
    return sign * order
  })
}

function fold(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
}
