import type { Application } from '../db/schema'
import { addDays } from './applications'

// Calendar export as an iCalendar (.ics) file (RFC 5545), which Google Calendar, Outlook and Apple
// Calendar all import. Written by hand: the format is small, and a library would be a heavy dependency
// for a dozen lines of text. Reminders need no server this way: the user's own calendar sends them.

export type CalendarEvent = {
  uid: string
  title: string
  description: string
} & ({ date: string } | { dateTime: string; durationMinutes: number })

export function buildIcs(events: CalendarEvent[], now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JobFit//SK', 'CALSCALE:GREGORIAN']
  for (const event of events) {
    lines.push('BEGIN:VEVENT', `UID:${event.uid}@jobfit`, `DTSTAMP:${stamp}`)
    if ('date' in event) {
      // All-day events end on the following day (the end date is exclusive).
      lines.push(`DTSTART;VALUE=DATE:${compactDate(event.date)}`, `DTEND;VALUE=DATE:${compactDate(addDays(event.date, 1))}`)
    } else {
      // "Floating" local time without a time zone: calendars show it at that hour wherever the user is.
      lines.push(
        `DTSTART:${compactDateTime(event.dateTime)}`,
        `DTEND:${compactDateTime(addMinutes(event.dateTime, event.durationMinutes))}`,
      )
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`, `DESCRIPTION:${escapeText(event.description)}`, 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/** Follow-up and interview of an application as calendar events (only the ones with a date). */
export function applicationEvents(app: Application): CalendarEvent[] {
  const name = [app.company, app.position].filter(Boolean).join(', ')
  const events: CalendarEvent[] = []
  if (app.followUpDate) {
    events.push({
      uid: `${app.id}-follow-up`,
      title: `Follow-up: ${name}`,
      description: 'Ozvi sa firme ohľadom žiadosti. Pripomienka z aplikácie JobFit.',
      date: app.followUpDate,
    })
  }
  if (app.interviewAt) {
    events.push({
      uid: `${app.id}-interview`,
      title: `Pohovor: ${name}`,
      description: app.notes || 'Pohovor z aplikácie JobFit.',
      dateTime: app.interviewAt,
      durationMinutes: 60,
    })
  }
  return events
}

/** Escapes text values: backslash, semicolon, comma and line breaks have a meaning in the format. */
export function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Lines longer than 75 bytes are folded: a line break followed by a space. Counted in UTF-8 bytes. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ''
  let bytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    // The first line may hold 75 bytes, continuation lines 74 plus the leading space.
    if (bytes + size > (parts.length === 0 ? 75 : 74)) {
      parts.push(current)
      current = ''
      bytes = 0
    }
    current += char
    bytes += size
  }
  parts.push(current)
  return parts.join('\r\n ')
}

const compactDate = (date: string) => date.replace(/-/g, '')

const compactDateTime = (dateTime: string) => `${dateTime.replace(/[-:]/g, '')}00`

function addMinutes(dateTime: string, minutes: number): string {
  const [date, time] = dateTime.split('T')
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const result = new Date(year, month - 1, day, hour, minute + minutes)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}T${pad(result.getHours())}:${pad(result.getMinutes())}`
}

/** Offers the calendar file for download. */
export function downloadIcs(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
