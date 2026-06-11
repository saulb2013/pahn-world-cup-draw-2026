// Client data layer for the pool game. Talks to /api/pool when a backend is
// configured; otherwise falls back to localStorage (so it still works locally),
// reusing the SAME pure rules from poolStore.js.

import {
  loginEntry,
  submitEntry,
  publicPlayers,
  adminListEntries,
  deleteEntry,
  unlockEntry,
} from './poolStore.js'

const LS_KEY = 'pahn-poolgame-v2'

const loadLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || 'null') || { players: {} }
  } catch {
    return { players: {} }
  }
}
const saveLocal = (state) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

async function post(body) {
  const res = await fetch('/api/pool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

// --- Public read: everyone who has submitted a team (no PINs) ---
export async function fetchPool() {
  try {
    const res = await fetch('/api/pool', { cache: 'no-store' })
    if (!res.ok) throw new Error('bad status')
    const json = await res.json()
    if (json.configured) return { backend: true, players: json.players || [] }
    return { backend: false, players: publicPlayers(loadLocal()) }
  } catch {
    return { backend: false, players: publicPlayers(loadLocal()) }
  }
}

// --- Log in / claim a name. Returns { ok, claimed, player } or { error } ---
export async function poolLogin(name, pin) {
  try {
    const { status, json } = await post({ action: 'login', name, pin })
    if (status === 503) throw new Error('local')
    if (json.error) return { error: json.error }
    return { ok: true, claimed: json.claimed, player: json.player, backend: true }
  } catch {
    const state = loadLocal()
    const r = loginEntry(state, name, pin)
    if (r.error) return { error: r.error }
    if (r.state !== state) saveLocal(r.state)
    return { ok: true, claimed: r.claimed, player: r.player, backend: false }
  }
}

// --- Submit (lock) a team. Returns { ok, player } or { error } ---
export async function poolSubmit(name, pin, picks) {
  try {
    const { status, json } = await post({ action: 'submit', name, pin, picks })
    if (status === 503) throw new Error('local')
    if (json.error) return { error: json.error }
    return { ok: true, player: json.player, backend: true }
  } catch {
    const state = loadLocal()
    const r = submitEntry(state, name, pin, picks, Date.now())
    if (r.error) return { error: r.error }
    saveLocal(r.state)
    return { ok: true, player: r.player, backend: false }
  }
}

// --- Admin: list all entries (with PINs) ---
export async function poolAdminList(adminKey) {
  try {
    const res = await fetch('/api/pool', {
      cache: 'no-store',
      headers: { 'x-admin-key': adminKey || '' },
    })
    const json = await res.json()
    if (json.configured) return { backend: true, entries: json.admin || [] }
    return { backend: false, entries: adminListEntries(loadLocal()) }
  } catch {
    return { backend: false, entries: adminListEntries(loadLocal()) }
  }
}

async function adminPost(body, adminKey) {
  try {
    const res = await fetch('/api/pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey || '' },
      body: JSON.stringify(body),
    })
    if (res.status === 503) throw new Error('local')
    const json = await res.json()
    return { ok: !json.error, entries: json.admin, error: json.error }
  } catch {
    let state = loadLocal()
    if (body.action === 'delete') state = deleteEntry(state, body.name)
    else if (body.action === 'unlock') state = unlockEntry(state, body.name)
    else if (body.action === 'reset') state = { players: {} }
    saveLocal(state)
    return { ok: true, entries: adminListEntries(state) }
  }
}

export const poolAdminDelete = (name, adminKey) => adminPost({ action: 'delete', name }, adminKey)
export const poolAdminUnlock = (name, adminKey) => adminPost({ action: 'unlock', name }, adminKey)
export const poolAdminReset = (adminKey) => adminPost({ action: 'reset' }, adminKey)
