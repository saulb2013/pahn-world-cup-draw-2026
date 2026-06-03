import Flag from './Flag.jsx'

const pct = (x) => (x < 0.001 ? '<0.1%' : (x * 100).toFixed(1) + '%')

export default function Leaderboard({ assignment, participants, odds, colorFor, computing }) {
  const rows = participants
    .map((p) => {
      const teams = (assignment[p] || [])
        .map((t) => ({ ...t, champ: odds?.[t.code]?.champ ?? 0 }))
        .sort((a, b) => b.champ - a.champ)
      const total = teams.reduce((s, t) => s + t.champ, 0)
      return { name: p, teams, total }
    })
    .sort((a, b) => b.total - a.total)

  const lead = rows[0]?.total || 1
  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`)

  return (
    <div className="leaderboard">
      <div className="section-head">
        <h2>
          Leaderboard{' '}
          {computing && <span className="recalc">recalculating…</span>}
        </h2>
        <p>
          Each player's score is the <strong>combined chance of their nations
          winning the World Cup</strong>. It's live — as results come in, the
          simulation re-runs and the standings shift.
        </p>
      </div>

      <div className="lb-list">
        {rows.map((r, i) => (
          <div className={`lb-row ${i === 0 ? 'lb-leader' : ''}`} key={r.name}>
            <div className="lb-rank">{medal(i)}</div>
            <div className="lb-main">
              <div className="lb-top">
                <span className="lb-name" style={{ color: colorFor(r.name) }}>
                  {r.name}
                </span>
                <span className="lb-pts">{pct(r.total)}</span>
              </div>
              <div className="lb-bar">
                <div
                  className="lb-bar-fill"
                  style={{
                    width: `${(r.total / lead) * 100}%`,
                    background: colorFor(r.name),
                  }}
                />
              </div>
              <div className="lb-teams">
                {r.teams.map((t) => (
                  <span className="lb-chip" key={t.code} title={`${t.name} · ${pct(t.champ)} to win`}>
                    <Flag code={t.code} name={t.name} />
                    <span className="lb-chip-pct">{pct(t.champ)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
