// Knockout-stage structure shared by the playable bracket UI and the odds
// engine, so the bracket you see is exactly the one being simulated.
//
// Format follows WC2026: the 12 group winners, 12 runners-up and the 8 best
// third-placed teams (32 total) advance to a single-elimination bracket seeded
// by group-stage performance (strongest meets weakest in the Round of 32).

import { computeStandings } from './groups.js'

export const KO_ROUNDS = [
  { key: 'R32', name: 'Round of 32', matches: 16 },
  { key: 'R16', name: 'Round of 16', matches: 8 },
  { key: 'QF', name: 'Quarter-finals', matches: 4 },
  { key: 'SF', name: 'Semi-finals', matches: 2 },
  { key: 'F', name: 'Final', matches: 1 },
]

// Standard single-elimination seed order (seed 1 only meets seed 2 in the final).
export function seedOrder(n) {
  let order = [1, 2]
  while (order.length < n) {
    const len = order.length * 2
    const next = []
    for (const s of order) {
      next.push(s)
      next.push(len + 1 - s)
    }
    order = next
  }
  return order
}
export const ORDER32 = seedOrder(32)

// Compare two standings rows, best first.
export const cmpRow = (a, b) =>
  b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.team.rank - b.team.rank

const filled = (s) =>
  s && s.home !== '' && s.away !== '' && s.home != null && s.away != null

export function groupStageComplete(fixtures, scores) {
  return fixtures.every((f) => filled(scores[f.id]))
}

// From sorted standings per group, pick the 32 qualifiers and rank them.
export function selectQualifiers(standingsByGroup) {
  const winners = []
  const runners = []
  const thirds = []
  standingsByGroup.forEach((rows) => {
    if (rows[0]) winners.push(rows[0])
    if (rows[1]) runners.push(rows[1])
    if (rows[2]) thirds.push(rows[2])
  })
  const bestThirds = [...thirds].sort(cmpRow).slice(0, 8)
  const ranked = [...winners, ...runners, ...bestThirds].sort(cmpRow)
  return { winners, runners, bestThirds, ranked }
}

// Map the ranked 32 (standings rows) into bracket positions as team objects.
export function seededTeams(ranked32) {
  return ORDER32.map((seed) => ranked32[seed - 1]?.team)
}

// Decide a knockout match from its score (null if undecided / teams unknown).
export function decideWinner(a, b, s) {
  if (!a || !b || !filled(s)) return null
  const h = Number(s.home)
  const aw = Number(s.away)
  if (h > aw) return a
  if (aw > h) return b
  if (s.pens === 'home') return a
  if (s.pens === 'away') return b
  return null // drawn, shootout winner not yet set
}

// Build the full bracket for display: teams flow forward as matches resolve.
export function buildKnockout(teams32, scores) {
  let feeders = teams32
  const rounds = []
  KO_ROUNDS.forEach((round) => {
    const matches = []
    for (let i = 0; i < round.matches; i++) {
      const a = feeders[i * 2]
      const b = feeders[i * 2 + 1]
      const id = `ko-${round.key}-${i}`
      const s = scores[id] || {}
      matches.push({
        id,
        roundKey: round.key,
        a,
        b,
        home: s.home,
        away: s.away,
        pens: s.pens,
        winner: decideWinner(a, b, s),
      })
    }
    rounds.push({ ...round, matches })
    feeders = matches.map((m) => m.winner)
  })
  return { rounds, champion: feeders[0] }
}

// Convenience: produce the seeded 32 (provisional if the group stage isn't done)
// straight from the live standings.
export function liveBracketTeams(groups, fixtures, scores) {
  const standings = groups.map((g) => computeStandings(g, fixtures, scores))
  const { ranked } = selectQualifiers(standings)
  return {
    teams: seededTeams(ranked),
    complete: groupStageComplete(fixtures, scores),
  }
}
