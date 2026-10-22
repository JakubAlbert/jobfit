import { useState, type DragEvent } from 'react'
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from '../db/schema'
import { scoreColor } from './scoreColor'
import { formatDate, STATUS_LABELS } from './statusLabels'

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
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3">
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
              className={`min-h-40 rounded-lg p-2 ${
                dropTarget === status ? 'bg-blue-50 ring-2 ring-blue-400 dark:bg-blue-950' : 'bg-slate-50 dark:bg-slate-900'
              }`}
            >
              <h2 className="mb-2 flex justify-between px-1 text-sm font-semibold">
                {STATUS_LABELS[status]}
                <span className="text-slate-500">{column.length}</span>
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
      className="cursor-grab rounded-md border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-slate-700 dark:bg-slate-950"
    >
      <button type="button" onClick={() => onOpen(app)} className="block w-full text-left">
        <span className="flex items-start justify-between gap-2">
          <span className="font-medium">{app.company || 'Bez firmy'}</span>
          {score !== undefined && (
            <span className={`text-sm font-semibold ${scoreColor(score)}`}>{score === null ? '–' : `${score} %`}</span>
          )}
        </span>
        <span className="block text-sm text-slate-600 dark:text-slate-400">{app.position}</span>
        {app.followUpDate && (
          <span
            className={`mt-1 block text-xs ${followUpDue ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-slate-500'}`}
          >
            {followUpDue ? 'Čas na follow-up' : 'Follow-up'} {formatDate(app.followUpDate)}
          </span>
        )}
      </button>
      <select
        value={app.status}
        onChange={(e) => onMove(app, e.target.value as ApplicationStatus)}
        aria-label={`Stav žiadosti ${app.company}`}
        className="mt-2 w-full rounded border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-700"
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
