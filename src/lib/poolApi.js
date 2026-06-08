// Data layer for the pool game — talks to /api/pool when a backend is
// configured, otherwise falls back to localStorage. Completely separate from the
// sweepstake draw's state (/api/state): its own endpoint, its own storage key,
// so the two games never touch each other.

const LS_KEY = 'pahn-poolgame-v1'

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || 'null')
  } catch {
    return null
  }
}
function saveLocal(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export async function fetchPool() {
  try {
    const res = await fetch('/api/pool', { cache: 'no-store' })
    if (!res.ok) throw new Error('bad status')
    const json = await res.json()
    if (json.configured) return { backend: true, state: json.state }
    return { backend: false, state: loadLocal() }
  } catch {
    return { backend: false, state: loadLocal() }
  }
}

// Returns { ok, backend }. On a configured backend this requires a valid admin
// key; locally it just writes to localStorage.
export async function pushPool(state, adminKey) {
  try {
    const res = await fetch('/api/pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey || '' },
      body: JSON.stringify(state),
    })
    if (res.ok) return { ok: true, backend: true }
    if (res.status === 503) {
      saveLocal(state)
      return { ok: true, backend: false }
    }
    return { ok: false, backend: true, status: res.status }
  } catch {
    saveLocal(state)
    return { ok: true, backend: false }
  }
}
