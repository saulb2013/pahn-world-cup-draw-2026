// Pool-game team rankings (the "Attack & Defend" pool format, random-draw
// variant). Teams are split into six pools A–F by strength; each team carries a
// fixed RANKING value used for scoring — lower-ranked (stronger) teams are worth
// fewer points per result, higher-ranked (underdog) teams worth more.
//
// Source: adjusted fixed-odds ratings (OddsChecker, 18 May 2026). Codes match
// src/data/teams.js so flags + live results line up. Rankings are fixed.

export const POOL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export const POOL_NAMES = {
  A: 'Elite favourites',
  B: 'Strong contenders',
  C: 'Dark horses',
  D: 'Qualifiers',
  E: 'Hopefuls',
  F: 'Underdogs',
}

// Each entry: [team code, ranking points]. Order is the published pool order.
export const POOLS = {
  A: [['fr', 4], ['es', 5], ['gb-eng', 6], ['ar', 8], ['br', 9], ['pt', 10], ['de', 12], ['nl', 14]],
  B: [['no', 16], ['be', 17], ['co', 18], ['ma', 19], ['us', 20], ['jp', 22], ['uy', 23], ['hr', 24]],
  C: [['ec', 25], ['mx', 26], ['sn', 27], ['se', 28], ['ch', 29], ['tr', 30], ['at', 31], ['ca', 32]],
  D: [['dz', 33], ['cz', 34], ['ci', 35], ['py', 36], ['eg', 37], ['kr', 38], ['ba', 39], ['gh', 40]],
  E: [['gb-sct', 41], ['au', 42], ['cv', 44], ['ir', 45], ['nz', 46], ['pa', 47], ['za', 48], ['tn', 49]],
  F: [['uz', 50], ['cd', 52], ['qa', 54], ['sa', 55], ['cw', 57], ['ht', 60], ['iq', 61], ['jo', 63]],
}

// code -> ranking points (for fast scoring lookups)
export const POOL_PTS = {}
// code -> pool letter
export const POOL_OF = {}
for (const letter of POOL_LETTERS) {
  for (const [code, pts] of POOLS[letter]) {
    POOL_PTS[code] = pts
    POOL_OF[code] = letter
  }
}
