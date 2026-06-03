// Front-end data layer. Talks to /api/state when a backend is configured
// (shared draw + live scores for the whole team); otherwise transparently
// falls back to localStorage so the app still works locally / offline.

import { loadState, saveState } from './storage.js'

export async function fetchState() {
  try {
    const res = await fetch('/api/state', { cache: 'no-store' })
    if (!res.ok) throw new Error('bad status')
    const json = await res.json()
    if (json.configured) return { backend: true, state: json.state }
    // API exists but no DB configured yet -> behave as local
    return { backend: false, state: loadState() }
  } catch {
    return { backend: false, state: loadState() }
  }
}

// Returns { ok, backend }. On a configured backend this requires a valid admin
// key; locally it just writes to localStorage.
export async function pushState(state, adminKey) {
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey || '' },
      body: JSON.stringify(state),
    })
    if (res.ok) return { ok: true, backend: true }
    if (res.status === 503) {
      saveState(state)
      return { ok: true, backend: false }
    }
    return { ok: false, backend: true, status: res.status }
  } catch {
    saveState(state)
    return { ok: true, backend: false }
  }
}
