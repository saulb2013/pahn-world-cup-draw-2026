import { useState } from 'react'
import Flag from './Flag.jsx'
import { computeStandings } from '../lib/groups.js'
import { SCHEDULE_TZ } from '../data/fixtures.js'

export default function Fixtures({ groups, fixtures, scores, setScore, ownerOf, colorFor, editable = true }) {
  const [openGroup, setOpenGroup] = useState(null)
  const [view, setView] = useState('groups') // groups | schedule

  const setVal = (id, side, value) => {
    const v = value === '' ? '' : Math.max(0, Math.min(99, Number(value)))
    setScore(id, side, v)
  }

  const ScoreBox = ({ f }) => {
    const s = scores[f.id] || {}
    return (
      <div className="match-score">
        <input type="number" min="0" value={s.home ?? ''} disabled={!editable}
          onChange={(e) => setVal(f.id, 'home', e.target.value)} />
        <span>:</span>
        <input type="number" min="0" value={s.away ?? ''} disabled={!editable}
          onChange={(e) => setVal(f.id, 'away', e.target.value)} />
      </div>
    )
  }

  const Owner = ({ code }) => {
    const o = ownerOf(code)
    if (!o) return null
    return <span className="owner-chip sm" style={{ background: colorFor(o) }}>{o}</span>
  }

  return (
    <div className="fixtures">
      <div className="section-head fixtures-head">
        <div>
          <h2>Fixtures &amp; tables</h2>
          <p>
            {editable
              ? 'All 72 group matches in official order. Enter scores as results come in — tables, bracket, leaderboard and odds update live and sync to everyone.'
              : 'All 72 group matches in official order. Scores are kept up to date by the admin and shown live.'}{' '}
            Kick-off times are {SCHEDULE_TZ}.
          </p>
        </div>
        <div className="view-toggle">
          <button className={view === 'groups' ? 'on' : ''} onClick={() => setView('groups')}>By group</button>
          <button className={view === 'schedule' ? 'on' : ''} onClick={() => setView('schedule')}>By date</button>
        </div>
      </div>

      {view === 'groups' && (
        <div className="group-grid">
          {groups.map((group) => {
            const standings = computeStandings(group, fixtures, scores)
            const groupFixtures = fixtures.filter((f) => f.group === group.letter)
            const collapsed = openGroup && openGroup !== group.letter
            return (
              <div className={`group-card ${collapsed ? 'dim' : ''}`} key={group.letter}>
                <button className="group-title"
                  onClick={() => setOpenGroup((g) => (g === group.letter ? null : group.letter))}>
                  <span className="group-letter">Group {group.letter}</span>
                  <span className="group-toggle">
                    {openGroup === group.letter ? 'hide fixtures' : 'show fixtures'}
                  </span>
                </button>

                <table className="standings">
                  <thead>
                    <tr>
                      <th className="left">Team</th>
                      <th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, i) => (
                      <tr key={row.team.code} className={i < 2 ? 'qualify' : ''}>
                        <td className="left">
                          <Flag code={row.team.code} name={row.team.name} />
                          <span className="st-name">{row.team.name}</span>
                          <Owner code={row.team.code} />
                        </td>
                        <td>{row.P}</td><td>{row.W}</td><td>{row.D}</td><td>{row.L}</td>
                        <td>{row.GD > 0 ? `+${row.GD}` : row.GD}</td>
                        <td className="pts">{row.Pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {openGroup === group.letter && (
                  <div className="match-list">
                    {groupFixtures.map((f) => (
                      <div className="match" key={f.id}>
                        <div className="match-meta">MD{f.matchday} · {f.date} · {f.time}</div>
                        <div className="match-row">
                          <div className="match-side home">
                            <span className="ms-name">{f.home.name}</span>
                            <Flag code={f.home.code} name={f.home.name} />
                          </div>
                          <ScoreBox f={f} />
                          <div className="match-side away">
                            <Flag code={f.away.code} name={f.away.name} />
                            <span className="ms-name">{f.away.name}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view === 'schedule' && (
        <div className="schedule">
          {groupByDate(fixtures).map(([date, list]) => (
            <div className="sch-day" key={date}>
              <div className="sch-date">{date}</div>
              {list.map((f) => (
                <div className="sch-match" key={f.id}>
                  <span className="sch-time">{f.time}</span>
                  <span className="sch-grp">{f.group}</span>
                  <div className="sch-team home">
                    <span className="ms-name">{f.home.name}</span>
                    <Owner code={f.home.code} />
                    <Flag code={f.home.code} name={f.home.name} />
                  </div>
                  <ScoreBox f={f} />
                  <div className="sch-team away">
                    <Flag code={f.away.code} name={f.away.name} />
                    <span className="ms-name">{f.away.name}</span>
                    <Owner code={f.away.code} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function groupByDate(fixtures) {
  const map = new Map()
  fixtures.forEach((f) => {
    if (!map.has(f.date)) map.set(f.date, [])
    map.get(f.date).push(f)
  })
  return [...map.entries()]
}
