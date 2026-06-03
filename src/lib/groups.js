// Group-stage model for the 48-team World Cup 2026: 12 groups (A–L) of 4.
//
// Teams are distributed into groups with a deterministic "serpentine" seeding
// from the FIFA-rank order (pot 1 across the groups, pot 2 back, etc.) so the
// groups are balanced and stable across reloads. From the groups we generate a
// round-robin fixture list, and standings are computed live from scores.

export const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')
const NUM_GROUPS = 12

export function buildGroups(teams) {
  const sorted = [...teams].sort((a, b) => a.rank - b.rank)
  const groups = GROUP_LETTERS.map((letter) => ({ letter, teams: [] }))

  sorted.forEach((team, i) => {
    const pot = Math.floor(i / NUM_GROUPS) // 0..3
    const posInPot = i % NUM_GROUPS
    // serpentine: even pots run A→L, odd pots run L→A
    const groupIndex = pot % 2 === 0 ? posInPot : NUM_GROUPS - 1 - posInPot
    groups[groupIndex].teams.push(team)
  })

  return groups
}

// Round-robin pairings for a 4-team group, grouped into 3 matchdays.
const RR_PAIRS = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [3, 0],
  [1, 2],
]

export function buildFixtures(groups) {
  const fixtures = []
  groups.forEach((group) => {
    RR_PAIRS.forEach(([h, a], idx) => {
      const home = group.teams[h]
      const away = group.teams[a]
      if (!home || !away) return
      fixtures.push({
        id: `${group.letter}-${home.code}-${away.code}`,
        group: group.letter,
        matchday: Math.floor(idx / 2) + 1,
        home,
        away,
      })
    })
  })
  return fixtures
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
