// Serverless API for the POOL GAME — a multi-user team-builder (separate from
// the sweepstake's /api/state).
//
//   GET  /api/pool                      -> { configured, players[] }   (public; PINs stripped)
//   GET  /api/pool   x-admin-key        -> { ..., admin: entries[] }    (with PINs)
//   POST /api/pool   { action, ... }    -> login | submit | admin ops
//
// Players log in with name + PIN (claim on first use), pick one team per pool
// A–F, and submit once (locked). State lives under Redis key wc2026:pool.

import {
  loginEntry,
  submitEntry,
  publicPlayers,
  adminListEntries,
  deleteEntry,
  unlockEntry,
} from '../src/lib/poolStore.js'

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
  return raw ? JSON.parse(raw) : { players: {} }
}
const setState = (state) => redis(['SET', KEY, JSON.stringify(state)])

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const isAdmin = (req.headers['x-admin-key'] || '') === ADMIN_KEY

  if (!configured) return res.status(200).json({ configured: false, players: [] })

  try {
    if (req.method === 'GET') {
      const state = await getState()
      const out = { configured: true, players: publicPlayers(state) }
      if (isAdmin) out.admin = adminListEntries(state)
      return res.status(200).json(out)
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const { action } = body
      const state = await getState()

      if (action === 'login') {
        const r = loginEntry(state, body.name, body.pin)
        if (r.error) return res.status(400).json({ error: r.error })
        if (r.state !== state) await setState(r.state)
        return res.status(200).json({ ok: true, claimed: r.claimed, player: r.player })
      }

      if (action === 'submit') {
        const r = submitEntry(state, body.name, body.pin, body.picks, Date.now())
        if (r.error) return res.status(400).json({ error: r.error })
        await setState(r.state)
        return res.status(200).json({ ok: true, player: r.player })
      }

      // --- admin only ---
      if (!isAdmin) return res.status(401).json({ error: 'Not authorised' })

      if (action === 'delete') {
        await setState(deleteEntry(state, body.name))
        return res.status(200).json({ ok: true, admin: adminListEntries(await getState()) })
      }
      if (action === 'unlock') {
        await setState(unlockEntry(state, body.name))
        return res.status(200).json({ ok: true, admin: adminListEntries(await getState()) })
      }
      if (action === 'reset') {
        await setState({ players: {} })
        return res.status(200).json({ ok: true, admin: [] })
      }

      return res.status(400).json({ error: 'Unknown action' })
    }
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
