import { WEIGHTS, type MatchResult } from '../lib/matchScore'
import { scoreColor } from './scoreColor'
import { hintClass } from './ui'

interface Segment {
  skill: string
  matched: boolean
  weight: number
}

/**
 * Score with the full breakdown. The bar is built from the skills themselves: one segment per skill,
 * must-have segments twice as wide as nice-to-have ones, filled when the CV has the skill.
 * So the bar is the formula, drawn: the filled share of its length is exactly the score.
 */
export function ScoreCard({ match }: { match: MatchResult }) {
  const segments: Segment[] = [
    ...match.matchedMustHave.map((skill) => ({ skill, matched: true, weight: WEIGHTS.mustHave })),
    ...match.missingMustHave.map((skill) => ({ skill, matched: false, weight: WEIGHTS.mustHave })),
    ...match.matchedNiceToHave.map((skill) => ({ skill, matched: true, weight: WEIGHTS.niceToHave })),
    ...match.missingNiceToHave.map((skill) => ({ skill, matched: false, weight: WEIGHTS.niceToHave })),
  ]
  const mustTotal = match.matchedMustHave.length + match.missingMustHave.length
  const niceTotal = match.matchedNiceToHave.length + match.missingNiceToHave.length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <p className={`font-display text-7xl leading-none font-bold tracking-tight ${scoreColor(match.score)}`}>
          {match.score === null ? '–' : `${match.score} %`}
        </p>
        <p className={`${hintClass} max-w-xs pb-1`}>
          {match.score === null
            ? 'Inzerát neuvádza žiadne zručnosti, skóre sa nedá vypočítať.'
            : `Povinné: ${match.matchedMustHave.length} z ${mustTotal} (váha ${WEIGHTS.mustHave}×), voliteľné: ${match.matchedNiceToHave.length} z ${niceTotal} (váha ${WEIGHTS.niceToHave}×). Počíta to kód, nie AI.`}
        </p>
      </div>

      {segments.length > 0 && (
        <div>
          <div className="flex h-4 gap-1" role="img" aria-label={`Zhoda ${match.score ?? 0} %`}>
            {segments.map((segment) => (
              <span
                key={segment.skill}
                title={`${segment.skill}: ${segment.matched ? 'máš' : 'chýba'}`}
                style={{ flexGrow: segment.weight }}
                className={`basis-0 rounded-full ${segment.matched ? 'bg-offer-ink/70' : 'bg-rejected'}`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Každý dielik je jedna zručnosť, povinné sú dvakrát širšie.</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <SkillGroup title="Povinné zručnosti" matched={match.matchedMustHave} missing={match.missingMustHave} />
        <SkillGroup title="Výhodou" matched={match.matchedNiceToHave} missing={match.missingNiceToHave} />
      </div>
    </div>
  )
}

function SkillGroup({ title, matched, missing }: { title: string; matched: string[]; missing: string[] }) {
  if (matched.length + missing.length === 0) return null
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {matched.map((skill) => (
          <li key={skill} className="rounded-full bg-offer px-3 py-1 text-sm font-medium text-offer-ink">
            ✓ {skill}
          </li>
        ))}
        {missing.map((skill) => (
          <li key={skill} className="rounded-full bg-rejected px-3 py-1 text-sm font-medium text-rejected-ink">
            ✗ {skill}
          </li>
        ))}
      </ul>
    </div>
  )
}
