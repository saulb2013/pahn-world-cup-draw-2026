// Pool-game engine: a random per-pool draw + the PDF's scoring system.
//
// DRAW: each player is dealt one random team from each of the six pools (A–F).
// Within a pool, teams are dealt without replacement so no two players share a
// team until the eight-team pool is exhausted (only repeats when >8 players).
//
// SCORING (per the rules):
//   Points per result: Win = ranking × 3, Draw = ranking × 1, Loss = 0
//   Round multipliers:  Group ×1, R32 ×2, R16 ×3, QF ×4, SF ×5, Final ×6
//   (Final counts for the winner only. A win on penalties counts as a win.)
// A player's total is the sum of their six teams' earned points.

import { TEAMS } from '../data/teams.js'
import { POOL_LETTERS, POOLS, POOL_PTS } from '../data/pools.js'
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

export function shuffle(array) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Deal one team per pool to each player. Returns { assignment, steps }:
//   assignment[player] = { A: code, B: code, ... F: code }
//   steps = ordered reveal list [{ player, letter, code }]
export function drawPools(players) {
  const assignment = {}
  players.forEach((p) => (assignment[p] = {}))
  const steps = []

  POOL_LETTERS.forEach((letter) => {
    const codes = POOLS[letter].map(([code]) => code)
    let deck = shuffle(codes)
    players.forEach((player) => {
      if (deck.length === 0) deck = shuffle(codes)
      const code = deck.shift()
      assignment[player][letter] = code
      steps.push({ player, letter, code })
    })
  })

  return { assignment, steps }
}

// Per-team set of knockout round keys won, from whichever result source is live
// (the football-data feed when present, otherwise the manually-seeded bracket).
function knockoutWinsByTeam(results) {
  const { groups, fixtures, scores, knockout } = results
  const wins = {}
  const add = (team, roundKey) => {
    if (!team) return
    ;(wins[team.code] ||= new Set()).add(roundKey)
  }

  if (Array.isArray(knockout) && knockout.length) {
    const { rounds } = feedBracket(knockout, BY_CODE)
    rounds.forEach((round) => {
      const roundKey = FEED_STAGE_TO_ROUND[round.stage]
      round.matches.forEach((m) => m.winner && add(m.winner, roundKey))
    })
  } else if (groups && fixtures) {
    const { teams } = liveBracketTeams(groups, fixtures, scores)
    const { rounds } = buildKnockout(teams, scores)
    rounds.forEach((round) =>
      round.matches.forEach((m) => m.winner && add(m.winner, round.key)),
    )
  }
  return wins
}

// Earned points for a single team code given the current results.
function teamPoints(code, standings, wins) {
  const rank = POOL_PTS[code]
  if (rank == null) return { group: 0, knockout: 0, total: 0 }
  const row = standings[code]
  const group = row ? rank * (3 * row.W + row.D) : 0 // group multiplier ×1
  let ko = 0
  if (wins[code]) {
    wins[code].forEach((roundKey) => {
      ko += rank * 3 * (KO_MULTIPLIER[roundKey] || 0)
    })
  }
  return { group, knockout: ko, total: group + ko }
}

// Score every player. Returns rows sorted best-first:
//   { player, total, teams: [{ letter, code, rank, group, knockout, total }] }
export function scorePlayers(players, assignment, results) {
  const standings = results.groups && results.fixtures
    ? pointsByTeam(results.groups, results.fixtures, results.scores || {})
    : {}
  const wins = knockoutWinsByTeam(results)

  const rows = players.map((player) => {
    const picks = assignment?.[player] || {}
    const teams = POOL_LETTERS.map((letter) => {
      const code = picks[letter]
      const pts = teamPoints(code, standings, wins)
      return { letter, code, rank: POOL_PTS[code], ...pts }
    })
    const total = teams.reduce((s, t) => s + t.total, 0)
    return { player, total, teams }
  })

  return rows.sort((a, b) => b.total - a.total || a.player.localeCompare(b.player))
}
