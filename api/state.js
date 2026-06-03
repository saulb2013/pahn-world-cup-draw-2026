// Serverless API for the shared draw + live scores.
//
//   GET  /api/state   -> { configured, state }   (anyone — read only)
//   POST /api/state   -> { ok, state }            (admin only)
//
// State is a single JSON blob: { participants, assignment, scores, updatedAt }.
// Writes require the header `x-admin-key` to match the ADMIN_KEY env var, which
// locks the draw: team members can read but never re-roll or edit.
//
// AUTOMATIC RESULTS: if FOOTBALL_DATA_KEY is set, every GET will (at most once
// every couple of minutes) pull finished group-stage results from
// football-data.org, map them onto our fixtures and merge them into the shared
// scores — so results + odds update with no manual entry. Manual admin scores
// still work and are kept for matches the feed hasn't reported yet.
//
// Storage uses an Upstash Redis REST endpoint (Vercel -> Storage -> Upstash).
// Without it the API reports `configured: false` and the front-end runs locally.

import { TEAMS } from '../src/data/teams.js'
import { OFFICIAL_FIXTURES } from '../src/data/fixtures.js'

const KEY = 'wc2026:state'
const ADMIN_KEY = process.env.ADMIN_KEY || 'elucidate'
const FD_KEY = process.env.FOOTBALL_DATA_KEY
const REFRESH_MS = 120000 // pull live results at most this often

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const configured = Boolean(REDIS_URL && REDIS_TOKEN)

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  })
  if (!res.ok) throw new Error(`redis ${res.status}`)
  return (await res.json()).result
}
const getState = async () => {
  const raw = await redis(['GET', KEY])
  return raw ? JSON.parse(raw) : null
}
const setState = (state) => redis(['SET', KEY, JSON.stringify(state)])

// ---- football-data.org results ingestion --------------------------------

const norm = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')

const NAME_TO_CODE = {}
TEAMS.forEach((t) => (NAME_TO_CODE[norm(t.name)] = t.code))
Object.entries({
  unitedstates: 'us', usa: 'us',
  southkorea: 'kr', korearepublic: 'kr',
  iran: 'ir', iriran: 'ir',
  turkey: 'tr', turkiye: 'tr',
  czechrepublic: 'cz', czechia: 'cz',
  capeverde: 'cv', caboverde: 'cv',
  ivorycoast: 'ci', cotedivoire: 'ci',
  drcongo: 'cd', congodr: 'cd', democraticrepublicofcongo: 'cd', drcongoofcongo: 'cd',
  bosnia: 'ba', bosniaherzegovina: 'ba', bosniaandherzegovina: 'ba',
}).forEach(([k, v]) => (NAME_TO_CODE[k] = v))

// fixture lookup: "GROUP|sortedPair" -> { id, home, away }
const FIX_INDEX = {}
OFFICIAL_FIXTURES.forEach((f) => {
  const key = `${f.group}|${[f.home, f.away].sort().join('-')}`
  FIX_INDEX[key] = { id: `${f.group}-${f.home}-${f.away}`, home: f.home, away: f.away }
})

async function fetchResults() {
  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': FD_KEY },
  })
  if (!res.ok) throw new Error(`football-data ${res.status}`)
  const data = await res.json()
  const out = {}
  ;(data.matches || []).forEach((m) => {
    const ft = m.score?.fullTime
    if (!ft || ft.home == null || ft.away == null) return
    const letter = (m.group || '').split('_').pop().toUpperCase()
    if (!/^[A-L]$/.test(letter)) return // group stage only
    const homeCode = NAME_TO_CODE[norm(m.homeTeam?.name)]
    const awayCode = NAME_TO_CODE[norm(m.awayTeam?.name)]
    if (!homeCode || !awayCode) return
    const fix = FIX_INDEX[`${letter}|${[homeCode, awayCode].sort().join('-')}`]
    if (!fix) return
    out[fix.id] =
      fix.home === homeCode ? { home: ft.home, away: ft.away } : { home: ft.away, away: ft.home }
  })
  return out
}

// Refresh from the feed if it's stale; returns possibly-updated state.
async function maybeRefresh(state) {
  if (!FD_KEY) return state
  const s = state || { scores: {} }
  const now = Date.now()
  if (now - (s.resultsFetchedAt || 0) < REFRESH_MS) return s
  s.resultsFetchedAt = now // throttle before awaiting, so viewers don't all fetch
  await setState(s)
  try {
    const fetched = await fetchResults()
    s.scores = { ...(s.scores || {}), ...fetched }
    s.updatedAt = now
    await setState(s)
  } catch {
    /* leave existing scores in place on any feed error */
  }
  return s
}

// ---- handler ------------------------------------------------------------

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    if (!configured) return res.status(200).json({ configured: false, state: null })
    try {
      const state = await maybeRefresh(await getState())
      return res.status(200).json({ configured: true, autoResults: Boolean(FD_KEY), state })
    } catch (e) {
      return res.status(500).json({ error: String(e) })
    }
  }

  if (req.method === 'POST') {
    if (!configured) return res.status(503).json({ error: 'No backend configured' })
    if ((req.headers['x-admin-key'] || '') !== ADMIN_KEY)
      return res.status(401).json({ error: 'Not authorised' })
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const prev = (await getState()) || {}
      const state = {
        participants: body.participants || [],
        assignment: body.assignment || null,
        scores: body.scores || {},
        resultsFetchedAt: prev.resultsFetchedAt || 0,
        updatedAt: Date.now(),
      }
      await setState(state)
      return res.status(200).json({ ok: true, state })
    } catch (e) {
      return res.status(500).json({ error: String(e) })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
