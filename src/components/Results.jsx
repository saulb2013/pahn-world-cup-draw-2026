import Flag from './Flag.jsx'

const pct = (x) => (x == null ? '' : x < 0.001 ? '<0.1%' : (x * 100).toFixed(1) + '%')

export default function Results({ assignment, participants, odds }) {
  // Rank players by the combined FIFA points of their squad — a fun "who drew
  // the strongest hand" measure.
  const ranked = [...participants]
    .map((p) => {
      const teams = assignment[p] || []
      const strength = teams.reduce((sum, t) => sum + t.points, 0)
      const avgRank =
        teams.length ? teams.reduce((s, t) => s + t.rank, 0) / teams.length : 0
      return { name: p, teams, strength, avgRank }
    })
    .sort((a, b) => b.strength - a.strength)

  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '')

  return (
    <div className="results">
      <div className="section-head">
        <h2>The squads</h2>
        <p>
          Ranked by combined FIFA strength. Each player holds one nation from
          every pool — the luck is in <em>which</em> ones.
        </p>
      </div>

      <div className="squad-grid">
        {ranked.map((r, i) => (
          <div className={`squad-card ${i === 0 ? 'leader' : ''}`} key={r.name}>
            <div className="squad-head">
              <div className="squad-title">
                <span className="squad-medal">{medal(i) || `#${i + 1}`}</span>
                <h3>{r.name}</h3>
              </div>
              <div className="squad-meta">
                <span>{r.teams.length} teams</span>
                <span className="dot">·</span>
                <span>avg rank {r.avgRank ? r.avgRank.toFixed(1) : '—'}</span>
              </div>
            </div>
            <ul className="squad-teams">
              {r.teams.map((t) => (
                <li key={t.code}>
                  <Flag code={t.code} name={t.name} />
                  <span className="team-name">{t.name}</span>
                  {odds?.[t.code] != null && (
                    <span className="team-odds" title="Chance to win the World Cup">
                      {pct(odds[t.code].champ)}
                    </span>
                  )}
                  <span className="team-rank">#{t.rank}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
