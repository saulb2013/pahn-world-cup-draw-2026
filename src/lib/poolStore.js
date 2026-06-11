// Shared, pure logic for the pool game's player entries — used by BOTH the
// server (api/pool.js) and the client's local-only fallback, so the rules are
// identical everywhere.
//
// State shape (stored under Redis key wc2026:pool):
//   { players: { [lowerName]: { name, pin, picks: {A..F}|null, submittedAt } } }
//
// Rules:
//   - Name + PIN. First login with a name claims it with that PIN.
//   - One team per pool A–F. Submitting locks the team (no take-backs).
//   - submittedAt (epoch ms) is stamped on submit and drives time-gated scoring
//     (you score nothing for matches that kicked off before you submitted).

import { POOLS, POOL_LETTERS } from '../data/pools.js'

const POOL_CODES = Object.fromEntries(
  POOL_LETTERS.map((L) => [L, new Set(POOLS[L].map(([code]) => code))]),
)

export const lowerName = (s) => String(s || '').trim().toLowerCase()

export function validatePicks(picks) {
  if (!picks || typeof picks !== 'object') return 'No teams selected'
  for (const L of POOL_LETTERS) {
    const code = picks[L]
    if (!code) return `Pick a team for Pool ${L}`
    if (!POOL_CODES[L].has(code)) return `Invalid pick for Pool ${L}`
  }
  return null
}

// Only a player's own, non-secret fields (no PIN).
export function publicPlayer(p) {
  return { name: p.name, picks: p.picks || null, submittedAt: p.submittedAt || null }
}

// Everyone who has submitted a full team — for the public leaderboard.
export function publicPlayers(state) {
  const players = state?.players || {}
  return Object.values(players)
    .filter((p) => p.picks && p.submittedAt)
    .map(publicPlayer)
}

// Claim a name (first time) or verify an existing one. Returns the updated state
// plus the player's own view, or an { error }.
export function loginEntry(state, name, pin) {
  const players = { ...(state?.players || {}) }
  const key = lowerName(name)
  if (!key) return { error: 'Enter your name' }
  if (!String(pin || '').trim()) return { error: 'Choose a PIN' }

  const existing = players[key]
  if (!existing) {
    players[key] = { name: String(name).trim(), pin: String(pin), picks: null, submittedAt: null }
    return { ok: true, claimed: true, player: publicPlayer(players[key]), state: { ...state, players } }
  }
  if (String(existing.pin) !== String(pin)) return { error: 'Wrong PIN for that name' }
  return { ok: true, claimed: false, player: publicPlayer(existing), state }
}

// Lock in a team. Requires a valid (name, pin); rejects if already submitted.
export function submitEntry(state, name, pin, picks, now) {
  const players = { ...(state?.players || {}) }
  const key = lowerName(name)
  const p = players[key]
  if (!p) return { error: 'Log in first' }
  if (String(p.pin) !== String(pin)) return { error: 'Wrong PIN' }
  if (p.submittedAt) return { error: 'Your team is already submitted — no changes allowed' }
  const bad = validatePicks(picks)
  if (bad) return { error: bad }
  const updated = { ...p, picks: { ...picks }, submittedAt: now }
  players[key] = updated
  return { ok: true, player: publicPlayer(updated), state: { ...state, players } }
}

// --- Admin-only helpers ---
export function adminListEntries(state) {
  const players = state?.players || {}
  return Object.values(players).map((p) => ({
    name: p.name,
    pin: p.pin,
    picks: p.picks || null,
    submittedAt: p.submittedAt || null,
  }))
}

export function deleteEntry(state, name) {
  const players = { ...(state?.players || {}) }
  delete players[lowerName(name)]
  return { ...state, players }
}

// Clear a player's submission so they can re-enter (admin override).
export function unlockEntry(state, name) {
  const players = { ...(state?.players || {}) }
  const p = players[lowerName(name)]
  if (p) players[lowerName(name)] = { ...p, picks: null, submittedAt: null }
  return { ...state, players }
}
