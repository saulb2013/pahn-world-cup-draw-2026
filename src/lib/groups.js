// Group-stage model for the 48-team World Cup 2026: 12 groups (A–L) of 4.
//
// These are the OFFICIAL group allocations (by team code, in listed order). From
// the groups we generate a round-robin fixture list, and standings are computed
// live from scores.

import { OFFICIAL_FIXTURES } from '../data/fixtures.js'

export const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

export const OFFICIAL_GROUPS = {
  A: ['mx', 'za', 'kr', 'cz'],
  B: ['ca', 'ba', 'qa', 'ch'],
  C: ['br', 'ma', 'ht', 'gb-sct'],
  D: ['us', 'py', 'au', 'tr'],
  E: ['de', 'cw', 'ci', 'ec'],
  F: ['nl', 'jp', 'se', 'tn'],
  G: ['be', 'eg', 'ir', 'nz'],
  H: ['es', 'cv', 'sa', 'uy'],
  I: ['fr', 'sn', 'iq', 'no'],
  J: ['ar', 'dz', 'at', 'jo'],
  K: ['pt', 'cd', 'uz', 'co'],
  L: ['gb-eng', 'hr', 'gh', 'pa'],
}

export function buildGroups(teams) {
  const byCode = Object.fromEntries(teams.map((t) => [t.code, t]))
  return GROUP_LETTERS.map((letter) => ({
    letter,
    teams: OFFICIAL_GROUPS[letter].map((code) => byCode[code]).filter(Boolean),
  }))
}

// Build the fixture list from the official schedule, preserving its order.
export function buildFixtures(groups) {
  const byCode = {}
  groups.forEach((g) => g.teams.forEach((t) => (byCode[t.code] = t)))
  return OFFICIAL_FIXTURES.map((f, i) => ({
    id: `${f.group}-${f.home}-${f.away}`,
    group: f.group,
    date: f.date,
    time: f.time,
    order: i,
    matchday: Math.floor(i / 24) + 1,
    home: byCode[f.home],
    away: byCode[f.away],
  })).filter((f) => f.home && f.away)
}

// scores: { [fixtureId]: { home: number, away: number } }
export function computeStandings(group, fixtures, scores) {
  const table = {}
  group.teams.forEach((t) => {
    table[t.code] = {
      team: t,
      P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0,
    }
  })

  fixtures
    .filter((f) => f.group === group.letter)
    .forEach((f) => {
      const s = scores[f.id]
      if (!s || s.home === '' || s.away === '' || s.home == null || s.away == null) return
      const hg = Number(s.home)
      const ag = Number(s.away)
      if (Number.isNaN(hg) || Number.isNaN(ag)) return

      const H = table[f.home.code]
      const A = table[f.away.code]
      H.P++; A.P++
      H.GF += hg; H.GA += ag
      A.GF += ag; A.GA += hg
      if (hg > ag) { H.W++; A.L++; H.Pts += 3 }
      else if (hg < ag) { A.W++; H.L++; A.Pts += 3 }
      else { H.D++; A.D++; H.Pts++; A.Pts++ }
    })

  return Object.values(table)
    .map((r) => ({ ...r, GD: r.GF - r.GA }))
    .sort(
      (a, b) =>
        b.Pts - a.Pts ||
        b.GD - a.GD ||
        b.GF - a.GF ||
        a.team.name.localeCompare(b.team.name),
    )
}

// Total tournament points earned by every team (across all groups), keyed by
// team code — used to score participants on the leaderboard.
export function pointsByTeam(groups, fixtures, scores) {
  const totals = {}
  groups.forEach((group) => {
    computeStandings(group, fixtures, scores).forEach((row) => {
      totals[row.team.code] = row
    })
  })
  return totals
}
