// Pool-game scoring (team-selection variant).
//
//   Points per result: Win = ranking × 3, Draw = ranking × 1, Loss = 0
//   Round multipliers:  Group ×1, R32 ×2, R16 ×3, QF ×4, SF ×5, Final ×6
//   (Final counts for the winner only. A win on penalties counts as a win.)
//
// TIME-GATING: a player only scores a match that kicked off AT OR AFTER they
// submitted their team. If you join late, you get nothing for matches already
// played. Each player carries a `submittedAt` (epoch ms); each match a kickoff
// epoch derived from the fixture (SAST = UTC+2) or the feed's UTC date.

import { TEAMS } from '../data/teams.js'
import { POOL_LETTERS, POOL_PTS } from '../data/pools.js'
import { pointsByTeam } from './groups.js'
import { buildKnockout, feedBracket, liveBracketTeams } from './knockout.js'

const BY_CODE = Object.fromEntries(TEAMS.map((t) => [t.code, t]))
export const teamByCode = (code) => BY_CODE[code] || null

const KO_MULTIPLIER = { R32: 2, R16: 3, QF: 4, SF: 5, F: 6 }
const FEED_STAGE_TO_ROUND = {
  LAST_32: 'R32',
  LAST_16: 'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF',
  FINAL: 'F',
}
const KO_ROUND_NAME = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  F: 'Final',
}

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}
const FAR_FUTURE = 8.64e15 // used when a kickoff time is unknown -> always counts

// Kickoff epoch (ms) for a group fixture. Fixtures store e.g. "Thu 11 Jun" +
// "21:00" in SAST (UTC+2); the tournament is entirely in 2026.
function fixtureStart(f) {
  try {
    const tok = String(f.date).trim().split(/\s+/)
    const day = parseInt(tok[tok.length - 2], 10)
    const mon = MONTHS[tok[tok.length - 1]]
    const [H, M] = String(f.time).split(':').map(Number)
    if (mon == null || !Number.isFinite(day)) return 0
    return Date.UTC(2026, mon, day, H - 2, M || 0)
  } catch {
    return 0
  }
}

// Per-match points ledger, grouped by round. Each match carries both teams, the
// points each earned, and its kickoff epoch (`start`).
export function matchBreakdown(results) {
  const { groups, fixtures, scores, knockout } = results || {}
  const rounds = []
  const num = (v) => (v === '' || v == null ? null : Number(v))

  // --- Group stage (×1) ---
  const groupMatches = []
  ;(fixtures || []).forEach((f) => {
    const s = scores?.[f.id]
    const hg = num(s?.home)
    const ag = num(s?.away)
    if (hg == null || ag == null || Number.isNaN(hg) || Number.isNaN(ag)) return
    const rankHome = POOL_PTS[f.home.code]
    const rankAway = POOL_PTS[f.away.code]
    let ptsHome = 0
    let ptsAway = 0
    let resultHome = 'L'
    let resultAway = 'L'
    if (hg > ag) { ptsHome = rankHome * 3; resultHome = 'W'; resultAway = 'L' }
    else if (ag > hg) { ptsAway = rankAway * 3; resultAway = 'W'; resultHome = 'L' }
    else { ptsHome = rankHome; ptsAway = rankAway; resultHome = 'D'; resultAway = 'D' }
    groupMatches.push({
      home: f.home, away: f.away, scoreHome: hg, scoreAway: ag,
      rankHome, rankAway, ptsHome, ptsAway, resultHome, resultAway,
      label: `Group ${f.group}`, start: fixtureStart(f),
    })
  })
  if (groupMatches.length) rounds.push({ name: 'Group stage', mult: 1, matches: groupMatches })

  // --- Knockouts ---
  const koMatch = (a, b, sh, sa, winnerCode, mult, start, pens) => {
    const rankHome = POOL_PTS[a.code]
    const rankAway = POOL_PTS[b.code]
    const homeWon = winnerCode === a.code
    const awayWon = winnerCode === b.code
    return {
      home: a, away: b, scoreHome: sh, scoreAway: sa,
      rankHome, rankAway,
      ptsHome: homeWon ? rankHome * 3 * mult : 0,
      ptsAway: awayWon ? rankAway * 3 * mult : 0,
      resultHome: homeWon ? 'W' : 'L',
      resultAway: awayWon ? 'W' : 'L',
      start, pens,
    }
  }

  if (Array.isArray(knockout) && knockout.length) {
    const { rounds: koRounds } = feedBracket(knockout, BY_CODE)
    koRounds.forEach((r) => {
      const key = FEED_STAGE_TO_ROUND[r.stage]
      const mult = KO_MULTIPLIER[key]
      const matches = []
      r.matches.forEach((m) => {
        if (!m.a || !m.b || m.scoreA == null || m.scoreB == null) return
        const start = m.date ? Date.parse(m.date) || FAR_FUTURE : FAR_FUTURE
        matches.push(koMatch(m.a, m.b, m.scoreA, m.scoreB, m.winner?.code, mult, start))
      })
      if (matches.length) rounds.push({ name: KO_ROUND_NAME[key], mult, matches })
    })
  } else if (groups && fixtures) {
    const { teams } = liveBracketTeams(groups, fixtures, scores)
    const { rounds: koRounds } = buildKnockout(teams, scores)
    koRounds.forEach((r) => {
      const mult = KO_MULTIPLIER[r.key]
      const matches = []
      r.matches.forEach((m) => {
        const s = scores?.[m.id]
        const sh = num(s?.home)
        const sa = num(s?.away)
        if (!m.a || !m.b || sh == null || sa == null) return
        matches.push(koMatch(m.a, m.b, sh, sa, m.winner?.code, mult, FAR_FUTURE, s?.pens))
      })
      if (matches.length) rounds.push({ name: KO_ROUND_NAME[r.key], mult, matches })
    })
  }

  return rounds
}

// Flatten the ledger into per-team scoring events: { code, pts, start }.
export function pointEvents(results) {
  const events = []
  for (const r of matchBreakdown(results)) {
    for (const m of r.matches) {
      events.push({ code: m.home.code, pts: m.ptsHome, start: m.start })
      events.push({ code: m.away.code, pts: m.ptsAway, start: m.start })
    }
  }
  return events
}

// Score every player from their picks, honouring the time gate. `players` is
// [{ name, picks: {A..F}, submittedAt }]. Returns rows sorted best-first.
export function scorePlayers(players, results) {
  const events = pointEvents(results || {})
  const rows = (players || []).map((p) => {
    const picks = p.picks || {}
    const sub = p.submittedAt || 0
    const owned = new Set(POOL_LETTERS.map((L) => picks[L]).filter(Boolean))
    const perTeam = {}
    let total = 0
    for (const e of events) {
      if (!owned.has(e.code)) continue
      if (e.start < sub) continue // kicked off before they submitted -> missed
      perTeam[e.code] = (perTeam[e.code] || 0) + e.pts
      total += e.pts
    }
    const teams = POOL_LETTERS.map((L) => {
      const code = picks[L]
      return { letter: L, code, rank: POOL_PTS[code], total: perTeam[code] || 0 }
    })
    return { player: p.name, total, teams, submittedAt: sub }
  })
  return rows.sort(
    (a, b) => b.total - a.total || String(a.player).localeCompare(String(b.player)),
  )
}

// Standings helper retained for any callers (group W/D/L by team).
export function teamStandings(results) {
  const { groups, fixtures, scores } = results || {}
  return groups && fixtures ? pointsByTeam(groups, fixtures, scores || {}) : {}
}
