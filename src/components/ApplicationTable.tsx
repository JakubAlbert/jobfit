import { useMemo, useState } from 'react'
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from '../db/schema'
import { filterApplications, sortApplications, type SortDirection, type SortKey } from '../lib/applications'
import { scoreColor } from './scoreColor'
import { formatDate, STATUS_BADGE, STATUS_LABELS } from './statusLabels'
import { hintClass, inputClass } from './ui'

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'company', label: 'Firma' },
  { key: 'position', label: 'Pozícia' },
  { key: 'status', label: 'Stav' },
  { key: 'appliedDate', label: 'Poslané' },
  { key: 'followUpDate', label: 'Follow-up' },
  { key: 'updatedAt', label: 'Zmenené' },
]

interface ApplicationTableProps {
  applications: Application[]
  scores: Map<string, number | null>
  onOpen: (application: Application) => void
}

export function ApplicationTable({ applications, scores, onOpen }: ApplicationTableProps) {
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'updatedAt', direction: 'desc' })

  const rows = useMemo(
    () => sortApplications(filterApplications(applications, { status, query }), sort.key, sort.direction),
    [applications, status, query, sort],
  )

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' },
    )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <label htmlFor="table-search" className="sr-only">
          Hľadať
        </label>
        <input
          id="table-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hľadať firmu, pozíciu, poznámky…"
          className={`${inputClass} sm:max-w-xs`}
        />
        <label htmlFor="table-status" className="sr-only">
          Filtrovať podľa stavu
        </label>
        <select
          id="table-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus | 'all')}
          className={`${inputClass} w-auto`}
        >
          <option value="all">Všetky stavy</option>
          {APPLICATION_STATUSES.map((item) => (
            <option key={item} value={item}>
              {STATUS_LABELS[item]}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className={hintClass}>Filtru nezodpovedá žiadna žiadosť.</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800">
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={sort.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="py-2 pr-4 font-semibold"
                  >
                    <button type="button" onClick={() => toggleSort(column.key)} className="hover:underline">
                      {column.label}
                      {sort.key === column.key && (sort.direction === 'asc' ? ' ↑' : ' ↓')}
                    </button>
                  </th>
                ))}
                <th scope="col" className="py-2 font-semibold">
                  Zhoda
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((app) => {
                const score = scores.get(app.id)
                return (
                  <tr
                    key={app.id}
                    onClick={() => onOpen(app)}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900"
                  >
                    <td className="py-2 pr-4">
                      {/* The button makes rows reachable by keyboard; the row click is a mouse shortcut. */}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpen(app)
                        }}
                        className="text-left font-medium hover:underline"
                      >
                        {app.company || 'Bez firmy'}
                      </button>
                    </td>
                    <td className="py-2 pr-4">{app.position}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${STATUS_BADGE[app.status]}`}>
                        {STATUS_LABELS[app.status]}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{formatDate(app.appliedDate)}</td>
                    <td className="py-2 pr-4">{formatDate(app.followUpDate)}</td>
                    <td className="py-2 pr-4">{new Date(app.updatedAt).toLocaleDateString('sk')}</td>
                    <td className={`py-2 font-semibold ${scoreColor(score ?? null)}`}>
                      {score === undefined ? '' : score === null ? '–' : `${score} %`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
