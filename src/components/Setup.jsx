import { useState } from 'react'
import { TEAMS } from '../data/teams.js'

const DEFAULT_SLOTS = 10

export default function Setup({ onStart }) {
  const [names, setNames] = useState(Array(DEFAULT_SLOTS).fill(''))

  const update = (i, v) => setNames((n) => n.map((x, idx) => (idx === i ? v : x)))
  const addSlot = () => setNames((n) => [...n, ''])
  const removeSlot = (i) => setNames((n) => n.filter((_, idx) => idx !== i))

  const clean = names.map((n) => n.trim()).filter(Boolean)
  const unique = new Set(clean.map((n) => n.toLowerCase()))
  const hasDupes = unique.size !== clean.length
  const valid = clean.length >= 2 && !hasDupes

  const perPersonMin = Math.floor(TEAMS.length / Math.max(clean.length, 1))
  const perPersonMax = Math.ceil(TEAMS.length / Math.max(clean.length, 1))
  const teamsLabel =
    clean.length >= 2
      ? perPersonMin === perPersonMax
        ? `${perPersonMin} teams each`
        : `${perPersonMin}–${perPersonMax} teams each`
      : '—'

  return (
    <div className="setup">
      <div className="setup-intro">
        <span className="kicker">Sweepstake Draw</span>
        <h1>
          Who's in the draw?
        </h1>
        <p className="lede">
          Add everyone taking part. We'll rank all {TEAMS.length} nations by their
          FIFA standing, split them into strength pools, then deal one team from
          each pool to every player — so the draw is balanced, not just luck.
        </p>
      </div>

      <div className="setup-card">
        <div className="setup-stats">
          <div className="stat">
            <span className="stat-num">{clean.length || 0}</span>
            <span className="stat-label">players</span>
          </div>
          <div className="stat">
            <span className="stat-num">{TEAMS.length}</span>
            <span className="stat-label">nations</span>
          </div>
          <div className="stat">
            <span className="stat-num">{teamsLabel}</span>
            <span className="stat-label">allocation</span>
          </div>
        </div>

        <div className="name-grid">
          {names.map((name, i) => (
            <div className="name-row" key={i}>
              <span className="name-index">{i + 1}</span>
              <input
                className="name-input"
                value={name}
                placeholder={`Player ${i + 1}`}
                onChange={(e) => update(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && valid) onStart(clean)
                }}
              />
              <button
                className="icon-btn"
                title="Remove"
                onClick={() => removeSlot(i)}
                disabled={names.length <= 2}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="setup-actions">
          <button className="btn ghost" onClick={addSlot}>
            + Add player
          </button>
          <button className="btn primary" disabled={!valid} onClick={() => onStart(clean)}>
            Start the draw →
          </button>
        </div>
        {hasDupes && (
          <p className="warn">Each player needs a unique name.</p>
        )}
      </div>
    </div>
  )
}
