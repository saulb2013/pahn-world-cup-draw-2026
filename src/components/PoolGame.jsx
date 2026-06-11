import { useEffect, useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
import Flag from './Flag.jsx'
import { scorePlayers, teamByCode, matchBreakdown } from '../lib/poolgame.js'
import { POOL_LETTERS, POOL_NAMES, POOLS } from '../data/pools.js'
import {
  fetchPool, poolLogin, poolSubmit,
  poolAdminList, poolAdminDelete, poolAdminUnlock, poolAdminReset,
} from '../lib/poolApi.js'

const PALETTE = [
  '#c66be0', '#2d9bf0', '#e8554e', '#27ae60', '#f2a93b',
  '#9b51e0', '#16c0ad', '#eb5a8c', '#6a7bff', '#ff7a45',
  '#0fb5a0', '#e0b020',
]
const POLL_MS = 15000
const CREDS_KEY = 'pahn-pool-me'
const fmt = (n) => Number(n || 0).toLocaleString('en-US')
const colorForName = (name) => {
  let h = 0
  for (let i = 0; i < String(name).length; i++) h = (h * 31 + name.charCodeAt(i)) % PALETTE.length
  return PALETTE[h]
}

// ---- Login / join -------------------------------------------------------
function PoolLogin({ onLogin, error }) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const valid = name.trim() && pin.trim()
  return (
    <div className="setup" style={{ maxWidth: 460 }}>
      <div className="setup-intro">
        <span className="kicker">Pool Game</span>
        <h1>Build your team</h1>
        <p className="lede">
          Enter your name and a PIN to start (or to come back to your team). Pick one
          team from each of the six pools — then lock it in. Choose any PIN you'll
          remember; you'll need it to log back in.
        </p>
      </div>
      <div className="setup-card">
        <label className="field-label">Your name</label>
        <input
          className="modal-input" style={{ textTransform: 'none', textAlign: 'left' }}
          value={name} placeholder="e.g. Saul"
          onChange={(e) => setName(e.target.value)}
        />
        <label className="field-label">Your PIN</label>
        <input
          className="modal-input" style={{ textTransform: 'none', textAlign: 'left' }}
          value={pin} placeholder="e.g. 1234" autoComplete="off"
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && valid && onLogin(name.trim(), pin.trim())}
        />
        {error && <p className="warn">{error}</p>}
        <button className="btn primary" style={{ width: '100%' }} disabled={!valid}
          onClick={() => onLogin(name.trim(), pin.trim())}>
          Continue →
        </button>
        <p className="rule-fine" style={{ marginTop: 12 }}>
          New name? It's claimed with this PIN. Returning? Use the same PIN.
        </p>
      </div>
    </div>
  )
}

// ---- Team builder (pick one per pool, then lock) ------------------------
function TeamBuilder({ picks, setPicks, onSubmit, onLogout, error }) {
  const chosen = POOL_LETTERS.filter((L) => picks[L]).length
  const complete = chosen === POOL_LETTERS.length
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="builder">
      <div className="section-head builder-head">
        <div>
          <h2>Pick your team</h2>
          <p>One team from each pool. Underdogs (higher ranking number) score more. You can't change it once you lock it in.</p>
        </div>
        <div className="builder-actions">
          <span className="builder-count">{chosen}/6 picked</span>
          <button className="btn ghost sm" onClick={onLogout}>Log out</button>
        </div>
      </div>

      {POOL_LETTERS.map((L) => (
        <div className="pick-pool" key={L}>
          <div className="pick-pool-head">
            <span className="dp-letter">Pool {L}</span>
            <span className="dp-name">{POOL_NAMES[L]}</span>
          </div>
          <div className="pick-grid">
            {POOLS[L].map(([code, pts]) => {
              const t = teamByCode(code)
              const on = picks[L] === code
              return (
                <button
                  key={code}
                  className={`pick-tile ${on ? 'on' : ''}`}
                  onClick={() => setPicks({ ...picks, [L]: code })}
                >
                  <Flag code={code} name={t?.name} />
                  <span className="pick-name">{t?.name}</span>
                  <span className="pick-rank">{pts}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {error && <p className="warn">{error}</p>}
      <div className="builder-submit">
        <button className="btn primary" disabled={!complete} onClick={() => setConfirm(true)}>
          {complete ? 'Lock in my team →' : `Pick ${6 - chosen} more`}
        </button>
      </div>

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🔒</div>
            <h3>Lock in your team?</h3>
            <p>This is final — <b>no changes</b> once submitted. Make sure your six picks are right.</p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setConfirm(false)}>Back</button>
              <button className="btn primary" onClick={() => { setConfirm(false); onSubmit() }}>
                Lock it in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Your locked team ---------------------------------------------------
function MyTeam({ me, row, onLogout, lateNote }) {
  const when = me.submittedAt
    ? new Date(me.submittedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : ''
  return (
    <div className="section-head">
      <div className="my-team-head">
        <div>
          <h2>{me.name}'s team <span className="locked-tag">🔒 locked</span></h2>
          <p>Submitted {when}. {fmt(row?.total)} points so far.</p>
        </div>
        <button className="btn ghost sm" onClick={onLogout}>Log out</button>
      </div>
      {lateNote && <p className="warn">{lateNote}</p>}
      <ul className="squad-teams my-team-list">
        {POOL_LETTERS.map((L) => {
          const t = row?.teams.find((x) => x.letter === L)
          const team = teamByCode(t?.code)
          return (
            <li key={L}>
              <span className="pool-tag">{L}</span>
              <Flag code={t?.code} name={team?.name} />
              <span className="team-name">{team?.name || '—'}</span>
              <span className="team-rank">r{t?.rank}</span>
              <span className="team-odds">{fmt(t?.total)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---- Leaderboard --------------------------------------------------------
function PoolLeaderboard({ rows, meName }) {
  const lead = rows[0]?.total || 1
  if (!rows.length)
    return (
      <div className="centered-msg" style={{ padding: '48px 20px' }}>
        <h2>No teams yet</h2>
        <p>Standings appear here once players lock in their teams.</p>
      </div>
    )
  return (
    <div className="leaderboard">
      <div className="section-head">
        <h2>Leaderboard</h2>
        <p>Live standings. Points = ranking × result (Win ×3, Draw ×1) × round multiplier (Group ×1 → Final ×6).</p>
      </div>
      <div className="lb-list">
        {rows.map((row, i) => (
          <div className={`lb-row ${row.player === meName ? 'lb-leader' : ''}`} key={row.player}>
            <span className="lb-rank">{i + 1}</span>
            <div className="lb-main">
              <div className="lb-top">
                <span className="lb-name">{row.player}{row.player === meName ? ' (you)' : ''}</span>
                <span className="lb-pts">{fmt(row.total)} pts</span>
              </div>
              <div className="lb-bar">
                <div className="lb-bar-fill" style={{ width: `${Math.max(2, (row.total / lead) * 100)}%`, background: colorForName(row.player) }} />
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

// ---- Points breakdown (global per-match ledger) -------------------------
function BdLine({ side, code }) {
  const team = teamByCode(code)
  return (
    <div className="bd-team-line">
      <span className={`bd-res bd-${side.result}`}>{side.result}</span>
      <Flag code={code} name={team?.name} />
      <span className="bd-name">{team?.name}</span>
      <span className="bd-rank">×{side.rank}</span>
      <span className={`bd-earned ${side.pts > 0 ? 'win' : 'zero'}`}>{side.pts > 0 ? `+${fmt(side.pts)}` : '0'}</span>
    </div>
  )
}
function PoolBreakdown({ rounds }) {
  const total = rounds.reduce((s, r) => s + r.matches.length, 0)
  return (
    <div className="breakdown">
      <div className="section-head">
        <h2>Points breakdown</h2>
        <p>Every played match and the points each team earned. (A player only banks these for matches that kicked off after they submitted.)</p>
      </div>
      {total === 0 ? (
        <div className="centered-msg" style={{ padding: '48px 20px' }}>
          <h2>No results yet</h2>
          <p>Points appear here after the first matches are played.</p>
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
                <div className="bd-card-head">{m.label || round.name} · {m.scoreHome}–{m.scoreAway}{m.pens ? ` (pens: ${m.pens})` : ''}</div>
                <BdLine code={m.home.code} side={{ rank: m.rankHome, pts: m.ptsHome, result: m.resultHome }} />
                <BdLine code={m.away.code} side={{ rank: m.rankAway, pts: m.ptsAway, result: m.resultAway }} />
              </div>
            ))}
          </div>
        ))
      )}
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

// ---- How it works -------------------------------------------------------
const ROUND_ROWS = [
  ['Group stage', '×1'], ['Round of 32', '×2'], ['Round of 16', '×3'],
  ['Quarter-final', '×4'], ['Semi-final', '×5'], ['Final (winner only)', '×6'],
]
function PoolRules() {
  return (
    <div className="rules">
      <div className="section-head">
        <h2>How it works</h2>
        <p>Pick your team, then watch the points roll in.</p>
      </div>
      <div className="rule-card">
        <h3>🧩 Build your team</h3>
        <p>Log in with your name + a PIN, then choose <strong>one team from each of the six pools (A–F)</strong> — six teams in total. Lock it in once; <strong>no changes after that</strong>.</p>
      </div>
      <div className="rule-card">
        <h3>🔢 Rankings = your multiplier</h3>
        <p>Every team has a fixed <strong>ranking number</strong> (see “Pools &amp; Rankings”). Stronger teams are <strong>low</strong>, underdogs <strong>high</strong> — and that number multiplies your points, so a deep run from an underdog is gold.</p>
      </div>
      <div className="rule-card">
        <h3>⚽ Points per result</h3>
        <ul className="rule-list">
          <li><span className="rule-key win">Win</span> ranking × 3</li>
          <li><span className="rule-key draw">Draw</span> ranking × 1</li>
          <li><span className="rule-key loss">Loss</span> 0</li>
        </ul>
        <p className="rule-fine">A win on penalties counts as a win.</p>
      </div>
      <div className="rule-card">
        <h3>📈 Deeper rounds are worth more</h3>
        <table className="rule-table"><tbody>
          {ROUND_ROWS.map(([r, m]) => (<tr key={r}><td>{r}</td><td className="rule-mult">{m}</td></tr>))}
        </tbody></table>
      </div>
      <div className="rule-card rule-example">
        <h3>🧮 Example</h3>
        <p>A team ranked <strong>8</strong> wins twice and draws once in the group:</p>
        <p className="rule-calc">(8×3) + (8×3) + (8×1) = <strong>56 pts</strong> <span className="rule-fine">(group ×1)</span></p>
        <p>…then wins its Round of 32 match (×2): <strong>8×3×2 = 48 pts</strong>.</p>
      </div>
      <div className="rule-card">
        <h3>⏰ Submit before kickoff</h3>
        <p>Your total is all six teams' points added up, live. <strong>Get your team in before the tournament starts</strong> — if you submit late, you score <strong>nothing for matches already played</strong>.</p>
      </div>
    </div>
  )
}

// ---- Admin panel --------------------------------------------------------
function AdminPanel({ entries, onUnlock, onDelete, onReset, onRefresh }) {
  return (
    <div className="admin-panel">
      <div className="section-head">
        <div className="my-team-head">
          <div>
            <h2>Admin · entries</h2>
            <p>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}. PINs shown so you can help anyone who forgets.</p>
          </div>
          <div className="builder-actions">
            <button className="btn ghost sm" onClick={onRefresh}>Refresh</button>
            <button className="btn danger sm" onClick={onReset}>Reset all</button>
          </div>
        </div>
      </div>
      <div className="admin-list">
        {entries.length === 0 && <p className="rule-fine">No entries yet.</p>}
        {entries.map((e) => (
          <div className="admin-row" key={e.name}>
            <div className="admin-main">
              <span className="admin-name">{e.name}</span>
              <span className="admin-pin">PIN {e.pin}</span>
              <span className={`admin-status ${e.submittedAt ? 'locked' : 'open'}`}>
                {e.submittedAt ? '🔒 submitted' : '… not submitted'}
              </span>
            </div>
            {e.picks && (
              <div className="admin-flags">
                {POOL_LETTERS.map((L) => (
                  <Flag key={L} code={e.picks[L]} name={teamByCode(e.picks[L])?.name} />
                ))}
              </div>
            )}
            <div className="admin-row-actions">
              {e.submittedAt && <button className="btn ghost sm" onClick={() => onUnlock(e.name)}>Unlock</button>}
              <button className="icon-btn" title="Delete" onClick={() => onDelete(e.name)}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Main ---------------------------------------------------------------
export default function PoolGame({ results, backend, isAdmin, adminKey }) {
  const [players, setPlayers] = useState([])
  const [me, setMe] = useState(null)
  const [picks, setPicks] = useState({})
  const [tab, setTab] = useState('team')
  const [loginError, setLoginError] = useState(null)
  const [buildError, setBuildError] = useState(null)
  const [adminEntries, setAdminEntries] = useState([])

  const saveCreds = (c) => { try { localStorage.setItem(CREDS_KEY, JSON.stringify(c)) } catch { /* ignore */ } }
  const clearCreds = () => { try { localStorage.removeItem(CREDS_KEY) } catch { /* ignore */ } }

  const refresh = () => fetchPool().then(({ players }) => setPlayers(players || []))

  // Initial load: public players + auto-login from saved creds.
  useEffect(() => {
    refresh()
    let creds = null
    try { creds = JSON.parse(localStorage.getItem(CREDS_KEY) || 'null') } catch { /* ignore */ }
    if (creds?.name && creds?.pin) {
      poolLogin(creds.name, creds.pin).then((r) => {
        if (r.ok) {
          setMe({ ...r.player, pin: creds.pin })
          setPicks(r.player.picks || {})
        } else {
          clearCreds()
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep standings fresh.
  useEffect(() => {
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [])

  // Admin entries
  const loadAdmin = () => poolAdminList(adminKey).then(({ entries }) => setAdminEntries(entries || []))
  useEffect(() => { if (isAdmin && tab === 'admin') loadAdmin() /* eslint-disable-next-line */ }, [isAdmin, tab])

  const resultsSig = useMemo(() => {
    const s = results?.scores || {}
    const done = Object.keys(s).filter((k) => {
      const v = s[k]; return v && v.home !== '' && v.away !== '' && v.home != null && v.away != null
    }).sort().map((k) => `${k}:${s[k].home}-${s[k].away}`)
    return done.join('|') + '#' + (results?.knockout ? JSON.stringify(results.knockout) : '')
  }, [results])

  const rows = useMemo(
    () => scorePlayers(players, results || {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [players, resultsSig],
  )
  const breakdown = useMemo(
    () => matchBreakdown(results || {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resultsSig],
  )
  const myRow = useMemo(
    () => (me ? scorePlayers([{ name: me.name, picks: me.picks, submittedAt: me.submittedAt }], results || {})[0] : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me, resultsSig],
  )

  const firstKickoff = useMemo(() => {
    const starts = breakdown.flatMap((r) => r.matches.map((m) => m.start)).filter(Boolean)
    return starts.length ? Math.min(...starts) : null
  }, [breakdown])
  const lateNote = me?.submittedAt && firstKickoff && me.submittedAt > firstKickoff
    ? 'You submitted after the tournament had started — matches played before then don’t count for you.'
    : null

  const login = async (name, pin) => {
    setLoginError(null)
    const r = await poolLogin(name, pin)
    if (r.error) { setLoginError(r.error); return }
    setMe({ ...r.player, pin })
    setPicks(r.player.picks || {})
    saveCreds({ name: r.player.name, pin })
    refresh()
  }

  const submit = async () => {
    setBuildError(null)
    const r = await poolSubmit(me.name, me.pin, picks)
    if (r.error) { setBuildError(r.error); return }
    setMe({ ...me, picks: r.player.picks, submittedAt: r.player.submittedAt })
    refresh()
    try { confetti({ particleCount: 140, spread: 80, origin: { y: 0.7 } }) } catch { /* ignore */ }
  }

  const logout = () => { setMe(null); setPicks({}); clearCreds() }

  const adminAct = async (fn) => { const { entries } = await fn(); setAdminEntries(entries || []); refresh() }

  const TABS = [
    ['team', 'My Team'],
    ['leaderboard', 'Leaderboard'],
    ['breakdown', 'Points breakdown'],
    ['pools', 'Pools & Rankings'],
    ['rules', 'How it works'],
    ...(isAdmin ? [['admin', 'Admin']] : []),
  ]

  return (
    <>
      <nav className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === 'team' && (
        !me ? (
          <PoolLogin onLogin={login} error={loginError} />
        ) : !me.submittedAt ? (
          <TeamBuilder picks={picks} setPicks={setPicks} onSubmit={submit} onLogout={logout} error={buildError} />
        ) : (
          <MyTeam me={me} row={myRow} onLogout={logout} lateNote={lateNote} />
        )
      )}
      {tab === 'leaderboard' && <PoolLeaderboard rows={rows} meName={me?.name} />}
      {tab === 'breakdown' && <PoolBreakdown rounds={breakdown} />}
      {tab === 'pools' && <PoolReference />}
      {tab === 'rules' && <PoolRules />}
      {tab === 'admin' && isAdmin && (
        <AdminPanel
          entries={adminEntries}
          onRefresh={loadAdmin}
          onUnlock={(name) => adminAct(() => poolAdminUnlock(name, adminKey))}
          onDelete={(name) => adminAct(() => poolAdminDelete(name, adminKey))}
          onReset={() => adminAct(() => poolAdminReset(adminKey))}
        />
      )}
    </>
  )
}
