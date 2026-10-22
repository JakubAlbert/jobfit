import { useState, type DragEvent } from 'react'
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from '../db/schema'
import { scoreChip } from './scoreColor'
import { formatDate, STATUS_BADGE, STATUS_LABELS, STATUS_WASH } from './statusLabels'

interface KanbanBoardProps {
  applications: Application[]
  scores: Map<string, number | null>
  today: string
  onMove: (application: Application, status: ApplicationStatus) => void
  onOpen: (application: Application) => void
}

// Cards can be dragged between columns (mouse, native HTML drag & drop) or moved with the status
// select on each card. The select also covers touch screens and keyboard users, where native drag
// & drop does not work, so no drag & drop library is needed.
export function KanbanBoard({ applications, scores, today, onMove, onOpen }: KanbanBoardProps) {
  const [dropTarget, setDropTarget] = useState<ApplicationStatus | null>(null)

  function handleDrop(event: DragEvent, status: ApplicationStatus) {
    event.preventDefault()
    setDropTarget(null)
    const app = applications.find((item) => item.id === event.dataTransfer.getData('text/plain'))
    if (app && app.status !== status) onMove(app, status)
  }

  return (
    // Stacked on phones (a sideways-scrolling board hides most columns there), side by side from sm up,
    // scrolling sideways on tablets and with all six columns visible at once on wide screens.
    <div className="-mx-4 px-4 pb-2 sm:overflow-x-auto">
      <div className="grid gap-3 sm:auto-cols-[minmax(15rem,1fr)] sm:grid-flow-col lg:auto-cols-[minmax(0,1fr)]">
        {APPLICATION_STATUSES.map((status) => {
          const column = applications.filter((app) => app.status === status)
          return (
            <section
              key={status}
              aria-label={STATUS_LABELS[status]}
              onDragOver={(event) => {
                event.preventDefault()
                setDropTarget(status)
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(event) => handleDrop(event, status)}
              // Each column reads as a coloured binder tab: the status colour heads and tints it.
              className={`rounded-2xl p-2 sm:min-h-48 ${STATUS_WASH[status]} ${
                dropTarget === status ? 'ring-2 ring-accent' : ''
              }`}
            >
              <h2
                className={`mb-2 flex items-center justify-between rounded-xl px-3 py-2 font-sans text-sm font-bold ${STATUS_BADGE[status]}`}
              >
                {STATUS_LABELS[status]}
                <span className="rounded-full bg-surface/70 px-2 text-xs">{column.length}</span>
              </h2>
              <ul className="space-y-2">
                {column.map((app) => (
                  <KanbanCard
                    key={app.id}
                    app={app}
                    score={scores.get(app.id)}
                    today={today}
                    onMove={onMove}
                    onOpen={onOpen}
                  />
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function KanbanCard(props: {
  app: Application
  score: number | null | undefined
  today: string
  onMove: (application: Application, status: ApplicationStatus) => void
  onOpen: (application: Application) => void
}) {
  const { app, score, today, onMove, onOpen } = props
  const followUpDue = app.followUpDate !== null && app.followUpDate <= today

  return (
    <li
      draggable
      onDragStart={(event) => event.dataTransfer.setData('text/plain', app.id)}
      className="cursor-grab rounded-xl bg-surface p-3 ring-1 ring-line active:cursor-grabbing"
    >
      <button type="button" onClick={() => onOpen(app)} className="block w-full text-left">
        <span className="flex items-start justify-between gap-2">
          <span className="font-semibold">{app.company || 'Bez firmy'}</span>
          {score !== undefined && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${scoreChip(score)}`}>
              {score === null ? '–' : `${score} %`}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-muted">{app.position}</span>
        {app.followUpDate && (
          <span
            className={`mt-2 inline-block text-xs ${
              followUpDue ? 'rounded-full bg-peach px-2 py-0.5 font-semibold text-peach-ink' : 'text-muted'
            }`}
          >
            {followUpDue ? 'Čas na follow-up' : 'Follow-up'} {formatDate(app.followUpDate)}
          </span>
        )}
      </button>
      <select
        value={app.status}
        onChange={(e) => onMove(app, e.target.value as ApplicationStatus)}
        aria-label={`Stav žiadosti ${app.company}`}
        className="mt-3 w-full rounded-lg border border-line bg-sunken px-2 py-1.5 text-xs font-semibold text-muted"
      >
        {APPLICATION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </li>
  )
}
