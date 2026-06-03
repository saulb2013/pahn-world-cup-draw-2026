// Serverless API for the shared draw + live scores.
//
//   GET  /api/state   -> { configured, state }   (anyone — read only)
//   POST /api/state   -> { ok, state }            (admin only)
//
// State is a single JSON blob: { participants, assignment, scores, updatedAt }.
// Writes require the header `x-admin-key` to match the ADMIN_KEY env var, which
// is what locks the draw: team members can read but never re-roll or edit.
//
// Storage uses an Upstash Redis REST endpoint (provisioned for free from the
// Vercel dashboard: Storage -> Upstash -> Redis). It injects KV_REST_API_URL
// and KV_REST_API_TOKEN automatically. Without those env vars the API reports
// `configured: false` and the front-end falls back to local-only mode.

const KEY = 'wc2026:state'
const ADMIN_KEY = process.env.ADMIN_KEY || 'elucidate'

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const configured = Boolean(REDIS_URL && REDIS_TOKEN)

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })
  if (!res.ok) throw new Error(`redis ${res.status}`)
  const json = await res.json()
  return json.result
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    if (!configured) return res.status(200).json({ configured: false, state: null })
    try {
      const raw = await redis(['GET', KEY])
      return res.status(200).json({ configured: true, state: raw ? JSON.parse(raw) : null })
    } catch (e) {
      return res.status(500).json({ error: String(e) })
    }
  }

  if (req.method === 'POST') {
    if (!configured)
      return res.status(503).json({ error: 'No backend configured' })
    if ((req.headers['x-admin-key'] || '') !== ADMIN_KEY)
      return res.status(401).json({ error: 'Not authorised' })
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const state = {
        participants: body.participants || [],
        assignment: body.assignment || null,
        scores: body.scores || {},
        updatedAt: Date.now(),
      }
      await redis(['SET', KEY, JSON.stringify(state)])
      return res.status(200).json({ ok: true, state })
    } catch (e) {
      return res.status(500).json({ error: String(e) })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
