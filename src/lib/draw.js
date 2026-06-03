// Pool-based "snake" sweepstake allocation.
//
// Teams are sorted by FIFA rank, then sliced into pools of size = number of
// participants. Pool 1 = the strongest teams, pool 2 = the next tier, etc.
// For every pool we shuffle the participants and hand out one team each, so
// each participant ends up with one team from each strength tier. With 48
// teams that isn't always divisible by the participant count, so the final
// (smallest) pool leaves a few participants one team short — that's expected
// and fair because the shuffle is re-rolled per pool.

export function shuffle(array) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Build the pools (arrays of teams) from the rank-sorted team list.
export function buildPools(teams, participantCount) {
  const sorted = [...teams].sort((a, b) => a.rank - b.rank)
  const pools = []
  for (let i = 0; i < sorted.length; i += participantCount) {
    pools.push(sorted.slice(i, i + participantCount))
  }
  return pools
}

// Returns an ordered list of "draw steps" — one per team — describing which
// participant the team is allocated to and which pool it came from. The order
// is pool-by-pool which makes for a satisfying tiered reveal.
export function generateDraw(teams, participants) {
  const pools = buildPools(teams, participants.length)
  const steps = []

  pools.forEach((pool, poolIndex) => {
    const order = shuffle(participants)
    pool.forEach((team, idx) => {
      steps.push({
        team,
        participant: order[idx],
        poolIndex,
        poolLabel: `Pool ${poolIndex + 1}`,
      })
    })
  })

  return steps
}

// Collapse the draw steps into a per-participant map of teams.
export function tallyByParticipant(steps, participants) {
  const map = {}
  participants.forEach((p) => (map[p] = []))
  steps.forEach((s) => map[s.participant].push(s.team))
  // keep each participant's teams sorted strongest-first
  Object.values(map).forEach((list) => list.sort((a, b) => a.rank - b.rank))
  return map
}
