import { useEffect, useMemo, useRef, useState } from 'react'
import Flag from './Flag.jsx'
import PoolDrawStage from './PoolDrawStage.jsx'
import { createMusic } from '../lib/music.js'
import { drawPools, scorePlayers, teamByCode, matchBreakdown } from '../lib/poolgame.js'
import { POOL_LETTERS, POOL_NAMES, POOLS } from '../data/pools.js'
import { fetchPool, pushPool } from '../lib/poolApi.js'

const PALETTE = [
  '#c66be0', '#2d9bf0', '#e8554e', '#27ae60', '#f2a93b',
  '#9b51e0', '#16c0ad', '#eb5a8c', '#6a7bff', '#ff7a45',
  '#0fb5a0', '#e0b020',
]
const POLL_MS = 15000
const fmt = (n) => n.toLocaleString('en-US')

// ---- Setup (admin only) -------------------------------------------------
function PoolSetup({ onRun }) {
  const [names, setNames] = useState(Array(10).fill(''))
  const update = (i, v) => setNames((n) => n.map((x, idx) => (idx === i ? v : x)))
  const addSlot = () => setNames((n) => [...n, ''])
  const removeSlot = (i) => setNames((n) => n.filter((_, idx) => idx !== i))

  const clean = names.map((n) => n.trim()).filter(Boolean)
  const unique = new Set(clean.map((n) => n.toLowerCase()))
  const hasDupes = unique.size !== clean.length
  const valid = clean.length >= 2 && !hasDupes

  return (
    <div className="setup">
      <div className="setup-intro">
        <span className="kicker">Pool Game</span>
        <h1>Who's in the pool game?</h1>
        <p className="lede">
          Add everyone taking part. Each player is dealt one random team from each
          of the six pools (A–F). Teams are then scored by their ranking — stronger
          teams are worth fewer points, underdogs more — across every round.
        </p>
      </div>

      <div className="setup-card">
        <div className="setup-stats">
          <div className="stat">
            <span className="stat-num">{clean.length || 0}</span>
            <span className="stat-label">players</span>
          </div>
          <div className="stat">
            <span className="stat-num">6</span>
            <span className="stat-label">pools</span>
          </div>
          <div className="stat">
            <span className="stat-num">6 teams</span>
            <span className="stat-label">each</span>
          </div>
        </div>

        <div className="name-grid">
          {names.map((name, i) => (
            <div className="name-row" key={i}>
              <span className="name-index">{i + 1}</span>
              <input
                className="name-input"
                value={name}
                placeholder={`Player ${i + 1}`}
                onChange={(e) => update(i, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && valid && onRun(clean)}
              />
              <button
                className="icon-btn"
                title="Remove"
                onClick={() => removeSlot(i)}
                disabled={names.length <= 2}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="setup-actions">
          <button className="btn ghost" onClick={addSlot}>+ Add player</button>
          <button className="btn primary" disabled={!valid} onClick={() => onRun(clean)}>
            Run the draw →
          </button>
        </div>
        {hasDupes && <p className="warn">Each player needs a unique name.</p>}
      </div>
    </div>
  )
}

// ---- Squads -------------------------------------------------------------
function PoolSquads({ rows, colorFor }) {
  return (
    <div className="section-head">
      <h2>Squads</h2>
      <p>Each player's six drawn teams — one per pool — with live points earned.</p>
      <div className="squad-grid" style={{ marginTop: 18 }}>
        {rows.map((row, i) => (
          <div className={`squad-card ${i === 0 ? 'leader' : ''}`} key={row.player}>
            <div className="squad-head">
              <div className="squad-title">
                <span className="owner-chip" style={{ background: colorFor(row.player) }}>
                  {row.player}
                </span>
              </div>
              <div className="squad-meta">
                <span className="lb-pts">{fmt(row.total)} pts</span>
              </div>
            </div>
            <ul className="squad-teams">
              {row.teams.map((t) => {
                const team = teamByCode(t.code)
                return (
                  <li key={t.letter}>
                    <span className="pool-tag">{t.letter}</span>
                    <Flag code={t.code} name={team?.name} />
                    <span className="team-name">{team?.name || '—'}</span>
                    <span className="team-rank">r{t.rank}</span>
                    <span className="team-odds">{fmt(t.total)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Leaderboard --------------------------------------------------------
function PoolLeaderboard({ rows, colorFor }) {
  const lead = rows[0]?.total || 1
  return (
    <div className="leaderboard">
      <div className="section-head">
        <h2>Leaderboard</h2>
        <p>
          Live standings. Points = team ranking × result (Win ×3, Draw ×1) ×
          round multiplier (Group ×1, R32 ×2, R16 ×3, QF ×4, SF ×5, Final ×6).
        </p>
      </div>
      <div className="lb-list">
        {rows.map((row, i) => (
          <div className={`lb-row ${i === 0 ? 'lb-leader' : ''}`} key={row.player}>
            <span className="lb-rank">{i + 1}</span>
            <div className="lb-main">
              <div className="lb-top">
                <span className="lb-name">{row.player}</span>
                <span className="lb-pts">{fmt(row.total)} pts</span>
              </div>
              <div className="lb-bar">
                <div
                  className="lb-bar-fill"
                  style={{
                    width: `${Math.max(2, (row.total / lead) * 100)}%`,
                    background: colorFor(row.player),
                  }}
                />
              </div>
              <div className="lb-teams">
                {row.teams.map((t) => {
                  const team = teamByCode(t.code)
                  return (
                    <span className="lb-chip" key={t.letter} title={`${team?.name} · ${fmt(t.total)} pts`}>
                      <Flag code={t.code} name={team?.name} />
                      <span className="lb-chip-pct">{fmt(t.total)}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Pools reference ----------------------------------------------------
function PoolReference() {
  return (
    <div className="fixtures">
      <div className="section-head">
        <h2>Pools &amp; Rankings</h2>
        <p>The six pools and each team's fixed ranking (the points multiplier per result). Lower = stronger.</p>
      </div>
      <div className="group-grid">
        {POOL_LETTERS.map((letter) => (
          <div className="group-card" key={letter}>
            <div className="group-title" style={{ cursor: 'default' }}>
              <span className="group-letter">Pool {letter}</span>
              <span className="group-toggle">{POOL_NAMES[letter]}</span>
            </div>
            <ul className="squad-teams">
              {POOLS[letter].map(([code, pts]) => {
                const team = teamByCode(code)
                return (
                  <li key={code}>
                    <Flag code={code} name={team?.name} />
                    <span className="team-name">{team?.name}</span>
                    <span className="team-rank">{pts}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Points breakdown (per team, per game) ------------------------------
function BreakdownTeamLine({ side, ownersOf, colorFor }) {
  const team = teamByCode(side.code)
  const owners = ownersOf(side.code)
  return (
    <div className="bd-team-line">
      <span className={`bd-res bd-${side.result}`}>{side.result}</span>
      <Flag code={side.code} name={team?.name} />
      <span className="bd-name">{team?.name}</span>
      {owners.map((o) => (
        <span className="owner-chip sm" key={o} style={{ background: colorFor(o) }}>{o}</span>
      ))}
      <span className="bd-rank">×{side.rank}</span>
      <span className={`bd-earned ${side.pts > 0 ? 'win' : 'zero'}`}>
        {side.pts > 0 ? `+${fmt(side.pts)}` : '0'}
      </span>
    </div>
  )
}

function PoolBreakdown({ rounds, ownersOf, colorFor }) {
  const total = rounds.reduce((s, r) => s + r.matches.length, 0)
  return (
    <div className="breakdown">
      <div className="section-head">
        <h2>Points breakdown</h2>
        <p>
          Every played match and the points each team earned — ranking × result ×
          the round's multiplier. This is exactly where each player's score comes from.
        </p>
      </div>

      {total === 0 ? (
        <div className="centered-msg" style={{ padding: '48px 20px' }}>
          <h2>No results yet</h2>
          <p>Points will appear here after the first matches are played.</p>
        </div>
      ) : (
        rounds.map((round) => (
          <div className="bd-round" key={round.name}>
            <div className="bd-round-head">
              <span className="bd-round-name">{round.name}</span>
              <span className="bd-round-mult">multiplier ×{round.mult}</span>
            </div>
            {round.matches.map((m, i) => (
              <div className="bd-card" key={i}>
                <div className="bd-card-head">
                  {m.label || round.name} · {m.scoreHome}–{m.scoreAway}
                  {m.pens ? ` (pens: ${m.pens})` : ''}
                </div>
                <BreakdownTeamLine
                  side={{ code: m.home.code, rank: m.rankHome, pts: m.ptsHome, result: m.resultHome }}
                  ownersOf={ownersOf}
                  colorFor={colorFor}
                />
                <BreakdownTeamLine
                  side={{ code: m.away.code, rank: m.rankAway, pts: m.ptsAway, result: m.resultAway }}
                  ownersOf={ownersOf}
                  colorFor={colorFor}
                />
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}

// ---- How it works -------------------------------------------------------
const ROUND_ROWS = [
  ['Group stage', '×1'],
  ['Round of 32', '×2'],
  ['Round of 16', '×3'],
  ['Quarter-final', '×4'],
  ['Semi-final', '×5'],
  ['Final (winner only)', '×6'],
]

function PoolRules() {
  return (
    <div className="rules">
      <div className="section-head">
        <h2>How it works</h2>
        <p>Everything you need to know about the pool game — the draw, and how points add up.</p>
      </div>

      <div className="rule-card">
        <h3>🎲 The draw</h3>
        <p>
          The 48 nations are split into <strong>six pools (A–F)</strong> by strength —
          Pool&nbsp;A is the elite favourites, Pool&nbsp;F the underdogs. Every player
          is randomly dealt <strong>one team from each pool</strong>, so everyone ends up
          with a balanced squad of <strong>six teams</strong>. No picking — it's pure luck of the draw.
        </p>
      </div>

      <div className="rule-card">
        <h3>🔢 Every team has a ranking</h3>
        <p>
          Each team carries a fixed <strong>ranking number</strong> (see the “Pools &amp; Rankings” tab).
          Stronger teams have a <strong>low</strong> number; underdogs a <strong>high</strong> one.
          That number is your <strong>points multiplier</strong> — so an underdog that goes on a run
          is worth far more than a favourite doing the same.
        </p>
      </div>

      <div className="rule-card">
        <h3>⚽ Points per result</h3>
        <p>For each match one of your teams plays, you earn:</p>
        <ul className="rule-list">
          <li><span className="rule-key win">Win</span> ranking × 3</li>
          <li><span className="rule-key draw">Draw</span> ranking × 1</li>
          <li><span className="rule-key loss">Loss</span> 0</li>
        </ul>
        <p className="rule-fine">A win on penalties counts as a win.</p>
      </div>

      <div className="rule-card">
        <h3>📈 The deeper they go, the more it's worth</h3>
        <p>
          Points earned in each round are multiplied — so results matter much more
          in the knockouts than in the group stage:
        </p>
        <table className="rule-table">
          <tbody>
            {ROUND_ROWS.map(([round, mult]) => (
              <tr key={round}>
                <td>{round}</td>
                <td className="rule-mult">{mult}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rule-card rule-example">
        <h3>🧮 A worked example</h3>
        <p>
          Say you draw a team with ranking <strong>8</strong>. In the group stage they win
          twice and draw once:
        </p>
        <p className="rule-calc">
          (8 × 3) + (8 × 3) + (8 × 1) = <strong>56 pts</strong> &nbsp;<span className="rule-fine">(group ×1)</span>
        </p>
        <p>They then win their Round of 32 match (×2):</p>
        <p className="rule-calc">
          8 × 3 × 2 = <strong>48 pts</strong>
        </p>
        <p>So far that's <strong>104 points</strong> from one team — and it keeps growing the further they advance.</p>
      </div>

      <div className="rule-card">
        <h3>🏆 Your total</h3>
        <p>
          Your score is simply <strong>all six of your teams' points added together</strong>,
          updated live after every result. Highest total wins. The 3rd/4th-place play-off
          doesn't count.
        </p>
      </div>
    </div>
  )
}

// ---- Main ---------------------------------------------------------------
export default function PoolGame({ results, backend, isAdmin, adminKey }) {
  const [phase, setPhase] = useState('loading') // loading | setup | drawing | done | waiting
  const [participants, setParticipants] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [steps, setSteps] = useState([])
  const [draft, setDraft] = useState(null)
  const [tab, setTab] = useState('leaderboard')
  const [confirmReset, setConfirmReset] = useState(false)
  const musicRef = useRef(null)

  const canManage = !backend || isAdmin

  const applyPool = (state) => {
    if (state?.assignment && state.participants?.length) {
      setParticipants(state.participants)
      setAssignment(state.assignment)
      return true
    }
    return false
  }

  // Initial load.
  useEffect(() => {
    let alive = true
    fetchPool().then(({ state }) => {
      if (!alive) return
      if (applyPool(state)) setPhase('done')
      else setPhase(canManage ? 'setup' : 'waiting')
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Viewers poll for the draw appearing / changing.
  useEffect(() => {
    if (!backend || isAdmin) return
    const id = setInterval(() => {
      fetchPool().then(({ state }) => {
        if (applyPool(state) && phase !== 'done') setPhase('done')
      })
    }, POLL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, isAdmin, phase])

  const colorFor = (name) => {
    const i = participants.indexOf(name)
    return PALETTE[(i + PALETTE.length) % PALETTE.length]
  }

  // Recompute scores only when a result actually changes (not every poll).
  const resultsSig = useMemo(() => {
    const s = results?.scores || {}
    const done = Object.keys(s)
      .filter((k) => {
        const v = s[k]
        return v && v.home !== '' && v.away !== '' && v.home != null && v.away != null
      })
      .sort()
      .map((k) => `${k}:${s[k].home}-${s[k].away}`)
    return done.join('|') + '#' + (results?.knockout ? JSON.stringify(results.knockout) : '')
  }, [results])

  const rows = useMemo(() => {
    if (!assignment || !participants.length) return []
    return scorePlayers(participants, assignment, results || {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment, participants, resultsSig])

  // code -> [players who drew it] (usually one; more only if >8 players)
  const ownersByCode = useMemo(() => {
    const m = {}
    if (assignment) {
      Object.entries(assignment).forEach(([player, picks]) => {
        Object.values(picks).forEach((code) => {
          ;(m[code] ||= []).push(player)
        })
      })
    }
    return m
  }, [assignment])
  const ownersOf = (code) => ownersByCode[code] || []

  // Per-match points ledger — recomputed only when a result changes.
  const breakdown = useMemo(
    () => matchBreakdown(results || {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resultsSig],
  )

  // Run the animated draw: compute it, hold it as a draft, reveal it, then
  // commit when the reveal finishes.
  const runDraw = (names) => {
    const { assignment: a, steps: s } = drawPools(names)
    // Start the anthem HERE, inside the click gesture, so the browser's autoplay
    // policy never blocks it (creating audio a tick later in an effect can be
    // left suspended). PoolDrawStage just controls mute and stops it on finish.
    try {
      musicRef.current?.stop()
      const m = createMusic()
      m.start()
      musicRef.current = m
    } catch {
      /* audio unavailable — draw still runs */
    }
    setParticipants(names)
    setDraft(a)
    setSteps(s)
    setPhase('drawing')
  }

  const finishDraw = async () => {
    musicRef.current?.stop()
    setAssignment(draft)
    setPhase('done')
    setTab('squads')
    if (canManage) await pushPool({ participants, assignment: draft }, adminKey)
  }

  // Stop the anthem if we leave the pool game mid-draw.
  useEffect(() => () => musicRef.current?.stop(), [])

  const doReset = async () => {
    setConfirmReset(false)
    setAssignment(null)
    setParticipants([])
    setPhase('setup')
    if (canManage) await pushPool({ participants: [], assignment: null }, adminKey)
  }

  const TABS = [
    ['rules', 'How it works'],
    ['pools', 'Pools & Rankings'],
    ['squads', 'Squads'],
    ['breakdown', 'Points breakdown'],
    ['leaderboard', 'Leaderboard'],
  ]

  if (phase === 'loading')
    return (
      <div className="centered-msg">
        <div className="spinner" />
        <p>Loading the pool game…</p>
      </div>
    )

  if (phase === 'waiting')
    return (
      <div className="centered-msg">
        <h2>The pool draw hasn't been made yet</h2>
        <p>Hang tight — this page updates automatically once it's done.</p>
      </div>
    )

  if (phase === 'setup') return <PoolSetup onRun={runDraw} />

  if (phase === 'drawing')
    return (
      <PoolDrawStage
        steps={steps}
        participants={participants}
        music={musicRef.current}
        onComplete={finishDraw}
      />
    )

  return (
    <>
      {canManage && (
        <div className="pool-admin-bar">
          <button className="btn ghost sm" onClick={() => setConfirmReset(true)}>
            Re-draw pool game
          </button>
        </div>
      )}

      <nav className="tabs">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            className={`tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'rules' && <PoolRules />}
      {tab === 'pools' && <PoolReference />}
      {tab === 'squads' && <PoolSquads rows={rows} colorFor={colorFor} />}
      {tab === 'breakdown' && (
        <PoolBreakdown rounds={breakdown} ownersOf={ownersOf} colorFor={colorFor} />
      )}
      {tab === 'leaderboard' && <PoolLeaderboard rows={rows} colorFor={colorFor} />}

      {confirmReset && (
        <div className="modal-overlay" onClick={() => setConfirmReset(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🎲</div>
            <h3>Re-draw the pool game?</h3>
            <p>
              This replaces everyone's current pool teams with a fresh random draw
              for all players. This can't be undone.
            </p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button className="btn danger" onClick={doReset}>Re-draw</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
