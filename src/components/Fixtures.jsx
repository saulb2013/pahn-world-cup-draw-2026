import { useState } from 'react'
import Flag from './Flag.jsx'
import { computeStandings } from '../lib/groups.js'

export default function Fixtures({ groups, fixtures, scores, setScore, ownerOf, colorFor, editable = true }) {
  const [openGroup, setOpenGroup] = useState(null)

  const setVal = (id, side, value) => {
    const v = value === '' ? '' : Math.max(0, Math.min(99, Number(value)))
    setScore(id, side, v)
  }

  return (
    <div className="fixtures">
      <div className="section-head">
        <h2>Group stage fixtures</h2>
        <p>
          {editable ? (
            <>
              All {fixtures.length} group matches across the 12 groups. Type in
              the scores as results come in — tables and the leaderboard update
              live and sync to everyone automatically.
            </>
          ) : (
            <>
              All {fixtures.length} group matches across the 12 groups. Scores
              are kept up to date by the admin and shown live here.
            </>
          )}
        </p>
      </div>

      <div className="group-grid">
        {groups.map((group) => {
          const standings = computeStandings(group, fixtures, scores)
          const groupFixtures = fixtures.filter((f) => f.group === group.letter)
          const collapsed = openGroup && openGroup !== group.letter
          return (
            <div className={`group-card ${collapsed ? 'dim' : ''}`} key={group.letter}>
              <button
                className="group-title"
                onClick={() =>
                  setOpenGroup((g) => (g === group.letter ? null : group.letter))
                }
              >
                <span className="group-letter">Group {group.letter}</span>
                <span className="group-toggle">
                  {openGroup === group.letter ? 'hide fixtures' : 'show fixtures'}
                </span>
              </button>

              <table className="standings">
                <thead>
                  <tr>
                    <th className="left">Team</th>
                    <th>P</th><th>W</th><th>D</th><th>L</th>
                    <th>GD</th><th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => {
                    const owner = ownerOf(row.team.code)
                    return (
                      <tr key={row.team.code} className={i < 2 ? 'qualify' : ''}>
                        <td className="left">
                          <Flag code={row.team.code} name={row.team.name} />
                          <span className="st-name">{row.team.name}</span>
                          {owner && (
                            <span
                              className="owner-chip"
                              style={{ background: colorFor(owner) }}
                              title={`Owned by ${owner}`}
                            >
                              {owner}
                            </span>
                          )}
                        </td>
                        <td>{row.P}</td><td>{row.W}</td><td>{row.D}</td><td>{row.L}</td>
                        <td>{row.GD > 0 ? `+${row.GD}` : row.GD}</td>
                        <td className="pts">{row.Pts}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {openGroup === group.letter && (
                <div className="match-list">
                  {groupFixtures.map((f) => {
                    const s = scores[f.id] || {}
                    return (
                      <div className="match" key={f.id}>
                        <div className="match-side home">
                          <span className="ms-name">{f.home.name}</span>
                          <Flag code={f.home.code} name={f.home.name} />
                        </div>
                        <div className="match-score">
                          <input
                            type="number"
                            min="0"
                            value={s.home ?? ''}
                            disabled={!editable}
                            onChange={(e) => setVal(f.id, 'home', e.target.value)}
                          />
                          <span>:</span>
                          <input
                            type="number"
                            min="0"
                            value={s.away ?? ''}
                            disabled={!editable}
                            onChange={(e) => setVal(f.id, 'away', e.target.value)}
                          />
                        </div>
                        <div className="match-side away">
                          <Flag code={f.away.code} name={f.away.name} />
                          <span className="ms-name">{f.away.name}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
