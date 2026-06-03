import { TEAMS } from '../data/teams.js'
import Flag from './Flag.jsx'

const pct = (x) => (x == null ? '—' : x < 0.001 ? '<0.1%' : (x * 100).toFixed(1) + '%')

export default function TitleOdds({ odds, ownerOf, colorFor, computing }) {
  const rows = TEAMS.map((t) => ({
    team: t,
    champ: odds?.[t.code]?.champ ?? 0,
    knockout: odds?.[t.code]?.knockout ?? 0,
  })).sort((a, b) => b.champ - a.champ || a.team.rank - b.team.rank)

  const max = rows[0]?.champ || 1

  return (
    <div className="odds">
      <div className="section-head">
        <h2>
          Title odds{' '}
          {computing && <span className="recalc">recalculating…</span>}
        </h2>
        <p>
          Live probability of winning the whole tournament for all {TEAMS.length}{' '}
          nations — from a Monte Carlo simulation that re-runs the bracket
          thousands of times. Enter results in Fixtures and these update on the
          spot; eliminated teams drop to zero.
        </p>
      </div>

      <div className="odds-list">
        {rows.map((r, i) => {
          const owner = ownerOf(r.team.code)
          return (
            <div className="odds-row" key={r.team.code}>
              <span className="odds-pos">{i + 1}</span>
              <Flag code={r.team.code} name={r.team.name} />
              <div className="odds-main">
                <div className="odds-top">
                  <span className="odds-name">{r.team.name}</span>
                  {owner && (
                    <span
                      className="owner-chip"
                      style={{ background: colorFor(owner) }}
                    >
                      {owner}
                    </span>
                  )}
                  <span className="odds-val">{pct(r.champ)}</span>
                </div>
                <div className="odds-bar">
                  <div
                    className="odds-bar-fill"
                    style={{ width: `${(r.champ / max) * 100}%` }}
                  />
                </div>
              </div>
              <span className="odds-ko" title="Chance of reaching the knockouts">
                {pct(r.knockout)} <span className="odds-ko-label">to R32</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
