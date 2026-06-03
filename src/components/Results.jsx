import Flag from './Flag.jsx'

export default function Results({ assignment, participants }) {
  // Plain rosters — no ranking here (that lives in Leaderboard / Title Odds).
  // Players are shown in draw order.
  return (
    <div className="results">
      <div className="section-head">
        <h2>The squads</h2>
        <p>
          Every player's nations — one drawn from each strength pool. See the
          Leaderboard and Title Odds tabs for who's on top.
        </p>
      </div>

      <div className="squad-grid">
        {participants.map((name) => {
          const teams = assignment[name] || []
          return (
            <div className="squad-card" key={name}>
              <div className="squad-head">
                <div className="squad-title">
                  <h3>{name}</h3>
                </div>
                <div className="squad-meta">
                  <span>{teams.length} teams</span>
                </div>
              </div>
              <ul className="squad-teams">
                {teams.map((t) => (
                  <li key={t.code}>
                    <Flag code={t.code} name={t.name} />
                    <span className="team-name">{t.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
