import { WEIGHTS, type MatchResult } from '../lib/matchScore'
import { scoreColor } from './scoreColor'
import { hintClass } from './ui'

/** Score with the full breakdown, so the user can see exactly how the number was computed. */
export function ScoreCard({ match }: { match: MatchResult }) {
  const mustTotal = match.matchedMustHave.length + match.missingMustHave.length
  const niceTotal = match.matchedNiceToHave.length + match.missingNiceToHave.length

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className={`text-5xl font-bold ${scoreColor(match.score)}`}>
          {match.score === null ? '–' : `${match.score} %`}
        </span>
        <span className={hintClass}>zhoda zručností</span>
      </div>

      {match.score === null ? (
        <p className={hintClass}>Inzerát neuvádza žiadne zručnosti, skóre sa nedá vypočítať.</p>
      ) : (
        <p className={hintClass}>
          Povinné: {match.matchedMustHave.length} z {mustTotal} (váha {WEIGHTS.mustHave}×), voliteľné:{' '}
          {match.matchedNiceToHave.length} z {niceTotal} (váha {WEIGHTS.niceToHave}×). Počíta to kód, nie AI.
        </p>
      )}

      <SkillGroup title="Povinné zručnosti" matched={match.matchedMustHave} missing={match.missingMustHave} />
      <SkillGroup title="Výhodou" matched={match.matchedNiceToHave} missing={match.missingNiceToHave} />
    </div>
  )
}

function SkillGroup({ title, matched, missing }: { title: string; matched: string[]; missing: string[] }) {
  if (matched.length + missing.length === 0) return null
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {matched.map((skill) => (
          <li
            key={skill}
            className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-900 dark:bg-green-950 dark:text-green-200"
          >
            ✓ {skill}
          </li>
        ))}
        {missing.map((skill) => (
          <li
            key={skill}
            className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-900 dark:bg-red-950 dark:text-red-200"
          >
            ✗ {skill}
          </li>
        ))}
      </ul>
    </div>
  )
}
