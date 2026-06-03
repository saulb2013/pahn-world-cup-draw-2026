// Live championship-probability engine.
//
// Every team's "% chance to win the tournament" is estimated by Monte Carlo:
// we simulate the rest of the World Cup thousands of times, respecting any real
// results that have already been entered, and count how often each team lifts
// the trophy. Because it reads the actual scores, the numbers move as the
// tournament progresses — teams that are eliminated fall to 0%, survivors rise.
//
// Match model: expected goals from a team's FIFA-points strength, sampled with
// a Poisson distribution. Knockout draws are settled by a strength-weighted
// penalty shootout. Qualification follows the real WC2026 format: 12 group
// winners + 12 runners-up + the 8 best third-placed teams advance to a 32-team
// single-elimination bracket seeded by strength.

import { GROUP_LETTERS } from './groups.js'

const BASE_GOALS = 1.4
const GAMMA = 0.4 // strength sensitivity (tuned for a realistic title spread)
const STRENGTH_REF = 250 // points-difference scale

function poisson(lambda) {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return k - 1
}

function expectedGoals(sA, sB) {
  const d = (sA - sB) / STRENGTH_REF
  return [BASE_GOALS * Math.exp(GAMMA * d), BASE_GOALS * Math.exp(-GAMMA * d)]
}

function simScore(a, b) {
  const [la, lb] = expectedGoals(a.points, b.points)
  return [poisson(la), poisson(lb)]
}

function knockoutWinner(a, b) {
  const [ga, gb] = simScore(a, b)
  if (ga > gb) return a
  if (gb > ga) return b
  // penalties, weighted slightly by strength
  return Math.random() < a.points / (a.points + b.points) ? a : b
}

function blankRow(team) {
  return { team, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 }
}

function applyResult(H, A, hg, ag) {
  H.P++; A.P++
  H.GF += hg; H.GA += ag; A.GF += ag; A.GA += hg
  if (hg > ag) { H.W++; A.L++; H.Pts += 3 }
  else if (hg < ag) { A.W++; H.L++; A.Pts += 3 }
  else { H.D++; A.D++; H.Pts++; A.Pts++ }
}

// Final standings for one group in a single simulation: real scores where they
// exist, simulated scores otherwise.
function simGroup(group, groupFixtures, scores) {
  const table = {}
  group.teams.forEach((t) => (table[t.code] = blankRow(t)))

  groupFixtures.forEach((f) => {
    const s = scores[f.id]
    let hg, ag
    if (s && s.home !== '' && s.away !== '' && s.home != null && s.away != null) {
      hg = Number(s.home); ag = Number(s.away)
    } else {
      ;[hg, ag] = simScore(f.home, f.away)
    }
    applyResult(table[f.home.code], table[f.away.code], hg, ag)
  })

  return Object.values(table)
    .map((r) => ({ ...r, GD: r.GF - r.GA }))
    .sort(
      (a, b) =>
        b.Pts - a.Pts ||
        b.GD - a.GD ||
        b.GF - a.GF ||
        Math.random() - 0.5,
    )
}

// Standard single-elimination seed order (1 meets 2 only in the final).
function seedOrder(n) {
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
const BRACKET_ORDER = seedOrder(32)

function simTournamentOnce(groups, fixturesByGroup, scores) {
  const winners = []
  const runners = []
  const thirds = []

  groups.forEach((group) => {
    const rows = simGroup(group, fixturesByGroup[group.letter], scores)
    winners.push(rows[0])
    runners.push(rows[1])
    if (rows[2]) thirds.push(rows[2])
  })

  const bestThirds = thirds
    .sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || Math.random() - 0.5)
    .slice(0, 8)

  // 32 qualifiers, seeded strongest-first by FIFA points.
  const qualifiers = [...winners, ...runners, ...bestThirds]
    .map((r) => r.team)
    .sort((a, b) => b.points - a.points)

  let bracket = BRACKET_ORDER.map((seed) => qualifiers[seed - 1])
  const reachedFinal = []

  while (bracket.length > 1) {
    if (bracket.length === 2) reachedFinal.push(bracket[0], bracket[1])
    const next = []
    for (let i = 0; i < bracket.length; i += 2) {
      next.push(knockoutWinner(bracket[i], bracket[i + 1]))
    }
    bracket = next
  }

  return {
    champion: bracket[0],
    finalists: reachedFinal,
    qualifiers,
  }
}

// Returns { [teamCode]: { champ, finalist, knockout } } as probabilities 0..1.
export function runForecast(groups, fixtures, scores, sims = 2000) {
  const fixturesByGroup = {}
  GROUP_LETTERS.forEach((l) => (fixturesByGroup[l] = []))
  fixtures.forEach((f) => fixturesByGroup[f.group].push(f))

  const tally = {}
  groups.forEach((g) =>
    g.teams.forEach((t) => (tally[t.code] = { champ: 0, finalist: 0, knockout: 0 })),
  )

  for (let i = 0; i < sims; i++) {
    const { champion, finalists, qualifiers } = simTournamentOnce(
      groups,
      fixturesByGroup,
      scores,
    )
    tally[champion.code].champ++
    finalists.forEach((t) => tally[t.code].finalist++)
    qualifiers.forEach((t) => tally[t.code].knockout++)
  }

  const out = {}
  Object.entries(tally).forEach(([code, c]) => {
    out[code] = {
      champ: c.champ / sims,
      finalist: c.finalist / sims,
      knockout: c.knockout / sims,
    }
  })
  return out
}
