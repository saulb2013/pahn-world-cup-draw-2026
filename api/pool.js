// Serverless API for the POOL GAME's shared draw (separate from /api/state).
//
//   GET  /api/pool  -> { configured, state }   (anyone — read only)
//   POST /api/pool  -> { ok, state }            (admin only)
//
// State is a single JSON blob: { participants, assignment, updatedAt }. The pool
// game reads live match results from the sweepstake's shared state; this
// endpoint only stores its own player draw, so the two games stay independent.
//
// Storage reuses the same Upstash Redis (its own key) and the same ADMIN_KEY.

const KEY = 'wc2026:pool'
const ADMIN_KEY = process.env.ADMIN_KEY || 'pahn'

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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    if (!configured) return res.status(200).json({ configured: false, state: null })
    try {
      return res.status(200).json({ configured: true, state: await getState() })
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
      const state = {
        participants: body.participants || [],
        assignment: body.assignment || null,
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
