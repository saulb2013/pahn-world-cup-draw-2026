import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TEAMS } from './data/teams.js'
import { generateDraw, tallyByParticipant } from './lib/draw.js'
import { buildGroups, buildFixtures } from './lib/groups.js'
import { runForecast } from './lib/forecast.js'
import { fetchState, pushState } from './lib/api.js'
import { clearState } from './lib/storage.js'
import { ADMIN_KEY } from './config.js'
import Setup from './components/Setup.jsx'
import DrawStage from './components/DrawStage.jsx'
import Results from './components/Results.jsx'
import Fixtures from './components/Fixtures.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import TitleOdds from './components/TitleOdds.jsx'
import Bracket from './components/Bracket.jsx'

const PALETTE = [
  '#c66be0', '#2d9bf0', '#e8554e', '#27ae60', '#f2a93b',
  '#9b51e0', '#16c0ad', '#eb5a8c', '#6a7bff', '#ff7a45',
  '#0fb5a0', '#e0b020',
]

const SIMS = 2500
const POLL_MS = 15000

const ALL_CODES = new Set(TEAMS.map((t) => t.code))
// A draw is valid only if it assigns exactly the current set of 48 teams.
function validAssignment(assignment) {
  if (!assignment) return false
  const codes = new Set()
  for (const list of Object.values(assignment)) {
    if (!Array.isArray(list)) return false
    for (const t of list) codes.add(t.code)
  }
  if (codes.size !== ALL_CODES.size) return false
  for (const c of ALL_CODES) if (!codes.has(c)) return false
  return true
}

export default function App() {
  const adminKey = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('admin') || ''
    } catch {
      return ''
    }
  }, [])
  const isAdmin = adminKey === ADMIN_KEY

  const [phase, setPhase] = useState('loading') // loading|setup|drawing|done|waiting
  const [backend, setBackend] = useState(false)
  const [participants, setParticipants] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [scores, setScores] = useState({})
  const [knockout, setKnockout] = useState(null)
  const [steps, setSteps] = useState([])
  const [tab, setTab] = useState('squads')
  const [odds, setOdds] = useState(null)
  const [computing, setComputing] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [showReset, setShowReset] = useState(false)

  // Without a backend everyone is local admin; with one, only the admin key can
  // run/lock the draw and edit scores. This is the lock.
  const canManage = !backend || isAdmin

  const groups = useMemo(() => buildGroups(TEAMS), [])
  const fixtures = useMemo(() => buildFixtures(groups), [groups])

  const applyState = useCallback((state) => {
    if (state?.knockout !== undefined) setKnockout(state.knockout || null)
    // Only accept a draw that covers exactly the current 48 teams — otherwise
    // it's stale (made against an older team list) and would leave teams with
    // no owner. A fresh draw replaces it.
    if (state?.assignment && validAssignment(state.assignment)) {
      setParticipants(state.participants || [])
      setAssignment(state.assignment)
      setScores(state.scores || {})
      return true
    }
    return false
  }, [])

  // Initial load.
  useEffect(() => {
    let alive = true
    fetchState().then(({ backend: hasBackend, state }) => {
      if (!alive) return
      setBackend(hasBackend)
      const has = applyState(state)
      // Drop a stale local draw so it doesn't keep reappearing.
      if (!has && !hasBackend && state?.assignment) clearState()
      if (has) setPhase('done')
      else setPhase(!hasBackend || isAdmin ? 'setup' : 'waiting')
    })
    return () => {
      alive = false
    }
  }, [applyState, isAdmin])

  // Viewers stay in sync: poll on an interval AND refetch whenever the tab is
  // refocused, so a refresh / coming back to the tab always shows latest results.
  const editingRef = useRef(false)
  useEffect(() => {
    if (!backend || isAdmin) return
    const refresh = () => {
      fetchState().then(({ state }) => {
        if (!state) return
        if (applyState(state) && phase !== 'done') setPhase('done')
      })
    }
    const id = setInterval(refresh, POLL_MS)
    const onFocus = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [backend, isAdmin, applyState, phase])

  // A stable fingerprint of only the *completed* results — group games with both
  // scores entered, plus the knockout bracket. The Monte Carlo forecast uses
  // randomness, so we recompute ONLY when this changes: i.e. once per game that
  // comes in, not on every poll, re-render or half-typed score.
  const resultsSig = useMemo(() => {
    const done = []
    for (const f of fixtures) {
      const s = scores[f.id]
      if (s && s.home !== '' && s.away !== '' && s.home != null && s.away != null) {
        done.push(`${f.id}:${s.home}-${s.away}`)
      }
    }
    done.sort()
    return done.join('|') + '#' + (knockout ? JSON.stringify(knockout) : '')
  }, [fixtures, scores, knockout])

  // Championship-odds simulation — recomputes only when a result changes.
  useEffect(() => {
    if (phase !== 'done') return
    setComputing(true)
    const t = setTimeout(() => {
      setOdds(runForecast(groups, fixtures, scores, SIMS, knockout))
      setComputing(false)
    }, 200)
    return () => clearTimeout(t)
    // scores/knockout are intentionally excluded: resultsSig already captures
    // every meaningful change, so identical re-polls don't re-roll the odds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, groups, fixtures, resultsSig])

  // Persist scores (admin / local) — debounced.
  const firstScores = useRef(true)
  useEffect(() => {
    if (firstScores.current) {
      firstScores.current = false
      return
    }
    if (!canManage || !assignment) return
    const t = setTimeout(async () => {
      const res = await pushState({ participants, assignment, scores }, adminKey)
      if (res.ok) setSavedAt(Date.now())
    }, 700)
    return () => clearTimeout(t)
  }, [scores]) // eslint-disable-line react-hooks/exhaustive-deps

  const startDraw = (names) => {
    setParticipants(names)
    setSteps(generateDraw(TEAMS, names))
    setAssignment(null)
    setScores({})
    setPhase('drawing')
  }

  const finishDraw = async () => {
    const tally = tallyByParticipant(steps, participants)
    setAssignment(tally)
    setScores({})
    setPhase('done')
    setTab('squads')
    const res = await pushState(
      { participants, assignment: tally, scores: {} },
      adminKey,
    )
    if (res.ok) setSavedAt(Date.now())
  }

  // Resetting clears the shared draw immediately (you confirmed via the
  // type-to-confirm modal), so it doesn't reappear for you or the team — then
  // takes you to the setup screen to make the new one.
  const doReset = async () => {
    setShowReset(false)
    setAssignment(null)
    setScores({})
    setKnockout(null)
    setSteps([])
    setOdds(null)
    setPhase('setup')
    if (canManage) await pushState({ participants: [], assignment: null, scores: {} }, adminKey)
  }

  const setScore = (id, side, value) => {
    if (!canManage) return
    editingRef.current = true
    setScores((prev) => ({ ...prev, [id]: { ...prev[id], [side]: value } }))
  }

  const ownerMap = useMemo(() => {
    const m = {}
    if (assignment)
      Object.entries(assignment).forEach(([p, teams]) =>
        teams.forEach((t) => (m[t.code] = p)),
      )
    return m
  }, [assignment])
  const ownerOf = (code) => ownerMap[code]

  const colorFor = (name) => {
    const i = participants.indexOf(name)
    return PALETTE[(i + PALETTE.length) % PALETTE.length]
  }

  const TABS = [
    ['squads', 'Squads'],
    ['odds', 'Title Odds'],
    ['leaderboard', 'Leaderboard'],
    ['fixtures', 'Fixtures & Tables'],
    ['knockouts', 'Knockouts'],
  ]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/pahn-logo.svg" alt="PAHN" className="brand-logo" />
          <span className="brand-divider" />
          <div className="brand-text">
            <span className="brand-event">World Cup 2026</span>
            <span className="brand-sub">Sweepstake Draw</span>
          </div>
        </div>
        {phase === 'done' && (
          <div className="topbar-actions">
            {backend && (
              <span className={`mode-badge ${isAdmin ? 'admin' : ''}`}>
                {isAdmin ? '★ Admin' : '🔒 Locked'}
              </span>
            )}
            {canManage && (
              <button className="btn ghost sm" onClick={() => setShowReset(true)}>
                New draw
              </button>
            )}
          </div>
        )}
      </header>

      <main className="main">
        {phase === 'loading' && (
          <div className="centered-msg">
            <div className="spinner" />
            <p>Loading the draw…</p>
          </div>
        )}

        {phase === 'waiting' && (
          <div className="centered-msg">
            <h2>The draw hasn't been made yet</h2>
            <p>Hang tight — this page will update automatically once it's done.</p>
          </div>
        )}

        {phase === 'setup' && <Setup onStart={startDraw} />}

        {phase === 'drawing' && (
          <DrawStage steps={steps} participants={participants} onComplete={finishDraw} />
        )}

        {phase === 'done' && assignment && (
          <>
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

            {tab === 'squads' && (
              <Results assignment={assignment} participants={participants} />
            )}
            {tab === 'leaderboard' && (
              <Leaderboard
                assignment={assignment}
                participants={participants}
                odds={odds}
                colorFor={colorFor}
                computing={computing}
              />
            )}
            {tab === 'odds' && (
              <TitleOdds
                odds={odds}
                ownerOf={ownerOf}
                colorFor={colorFor}
                computing={computing}
              />
            )}
            {tab === 'fixtures' && (
              <Fixtures
                groups={groups}
                fixtures={fixtures}
                scores={scores}
                setScore={setScore}
                ownerOf={ownerOf}
                colorFor={colorFor}
                editable={canManage}
              />
            )}
            {tab === 'knockouts' && (
              <Bracket
                groups={groups}
                fixtures={fixtures}
                scores={scores}
                setScore={setScore}
                editable={canManage}
                koMatches={knockout}
              />
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <span>Built for PAHN · FIFA World Cup 2026</span>
        <span className="footer-note">
          {backend
            ? isAdmin
              ? 'Admin mode — your scores sync live to the whole team'
              : 'Live shared scores · title odds update automatically'
            : 'Title odds are model-based (Monte Carlo) and update live with results'}
        </span>
      </footer>

      {showReset && <ResetModal onCancel={() => setShowReset(false)} onConfirm={doReset} />}
    </div>
  )
}

const RESET_PHRASE = 'NEW DRAW'

function ResetModal({ onCancel, onConfirm }) {
  const [text, setText] = useState('')
  const ok = text.trim().toUpperCase() === RESET_PHRASE

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">⚠️</div>
        <h3>Start a brand-new draw?</h3>
        <p>
          This clears the current squads so you can run the draw again. The
          existing draw stays saved until you actually finish a new one — but
          please only do this if you really mean to re-draw for everyone.
        </p>
        <p className="modal-instruct">
          Type <b>{RESET_PHRASE}</b> to confirm:
        </p>
        <input
          className="modal-input"
          value={text}
          autoFocus
          placeholder={RESET_PHRASE}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ok && onConfirm()}
        />
        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn danger" disabled={!ok} onClick={onConfirm}>
            Start new draw
          </button>
        </div>
      </div>
    </div>
  )
}
