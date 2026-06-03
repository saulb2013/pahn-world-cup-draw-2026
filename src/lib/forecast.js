// Live championship-probability engine (Monte Carlo).
//
// Every team's "% chance to win" is estimated by simulating the rest of the
// World Cup thousands of times, respecting the real results entered so far, and
// counting how often each team lifts the trophy. It reads the actual scores —
// group AND knockout — so the numbers move as the tournament progresses:
// eliminated teams fall to 0%, survivors rise.
//
// Match model: expected goals from FIFA-points strength, Poisson-sampled.
// Knockout draws resolve by a strength-weighted shootout. Qualification and the
// bracket use the shared helpers in knockout.js, so the simulated bracket is the
// same one shown in the Knockouts tab.

import { computeStandings, GROUP_LETTERS } from './groups.js'
import {
  KO_ROUNDS,
  cmpRow,
  selectQualifiers,
  seededTeams,
  groupStageComplete,
  decideWinner,
} from './knockout.js'

const BASE_GOALS = 1.4
const GAMMA = 0.4
const STRENGTH_REF = 250

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

// One simulated final standings for a group (real scores where present).
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
    .sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || Math.random() - 0.5)
}

// Simulate a 32-team bracket. `koScores` lets already-played knockout results
// be honoured (used once the group stage is complete and the bracket is fixed).
function simBracket(teams32, koScores) {
  let feeders = teams32
  let finalists = []
  KO_ROUNDS.forEach((round) => {
    if (round.key === 'F') finalists = [feeders[0], feeders[1]]
    const next = []
    for (let i = 0; i < round.matches; i++) {
      const a = feeders[i * 2]
      const b = feeders[i * 2 + 1]
      const fixed = koScores && decideWinner(a, b, koScores[`ko-${round.key}-${i}`])
      next.push(fixed || knockoutWinner(a, b))
    }
    feeders = next
  })
  return { champion: feeders[0], finalists }
}

export function runForecast(groups, fixtures, scores, sims = 2500) {
  const fixturesByGroup = {}
  GROUP_LETTERS.forEach((l) => (fixturesByGroup[l] = []))
  fixtures.forEach((f) => fixturesByGroup[f.group].push(f))

  const tally = {}
  groups.forEach((g) =>
    g.teams.forEach((t) => (tally[t.code] = { champ: 0, finalist: 0, knockout: 0 })),
  )

  const complete = groupStageComplete(fixtures, scores)

  if (complete) {
    // Group stage finished -> qualifiers and seeding are fixed. Simulate only
    // the knockouts, honouring any results already entered.
    const standings = groups.map((g) => computeStandings(g, fixtures, scores))
    const { ranked } = selectQualifiers(standings)
    const teams32 = seededTeams(ranked)
    teams32.forEach((t) => t && (tally[t.code].knockout = sims))
    for (let i = 0; i < sims; i++) {
      const { champion, finalists } = simBracket(teams32, scores)
      if (champion) tally[champion.code].champ++
      finalists.forEach((t) => t && tally[t.code].finalist++)
    }
  } else {
    // Group stage in progress -> simulate groups, then knockouts fresh.
    for (let i = 0; i < sims; i++) {
      const standings = groups.map((g) =>
        simGroup(g, fixturesByGroup[g.letter], scores),
      )
      const { ranked } = selectQualifiers(standings)
      const teams32 = seededTeams(ranked)
      teams32.forEach((t) => t && tally[t.code].knockout++)
      const { champion, finalists } = simBracket(teams32, null)
      if (champion) tally[champion.code].champ++
      finalists.forEach((t) => t && tally[t.code].finalist++)
    }
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
