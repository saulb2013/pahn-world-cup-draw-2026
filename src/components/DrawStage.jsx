import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { TEAMS } from '../data/teams.js'
import { createMusic } from '../lib/music.js'
import Flag from './Flag.jsx'

// Phase timings (ms) at 1x speed.
const SHUFFLE_MS = 750
const HOLD_MS = 950
const FLICKER_MS = 55

export default function DrawStage({ steps, participants, onComplete }) {
  const [index, setIndex] = useState(0)
  const [display, setDisplay] = useState(steps[0]?.team)
  const [locked, setLocked] = useState(false)
  const [assigned, setAssigned] = useState(() =>
    Object.fromEntries(participants.map((p) => [p, []])),
  )
  const [speed, setSpeed] = useState(1)
  const speedRef = useRef(speed)
  speedRef.current = speed

  const [muted, setMuted] = useState(false)
  const musicRef = useRef(null)

  // Start the stadium anthem when the draw begins; fade out when it unmounts.
  useEffect(() => {
    const music = createMusic()
    musicRef.current = music
    music.start()
    return () => music.stop()
  }, [])

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m
      musicRef.current?.setMuted(next)
      return next
    })
  }

  // Drive the reveal of a single step.
  useEffect(() => {
    if (index >= steps.length) return
    const step = steps[index]
    setLocked(false)

    const flicker = setInterval(() => {
      setDisplay(TEAMS[Math.floor(Math.random() * TEAMS.length)])
    }, FLICKER_MS)

    const lockTimer = setTimeout(() => {
      clearInterval(flicker)
      setDisplay(step.team)
      setLocked(true)
      popConfetti()
    }, SHUFFLE_MS / speedRef.current)

    const nextTimer = setTimeout(
      () => {
        setAssigned((prev) => ({
          ...prev,
          [step.participant]: [...prev[step.participant], step.team],
        }))
        setIndex((i) => i + 1)
      },
      (SHUFFLE_MS + HOLD_MS) / speedRef.current,
    )

    return () => {
      clearInterval(flicker)
      clearTimeout(lockTimer)
      clearTimeout(nextTimer)
    }
  }, [index, steps])

  // When every step is dealt, celebrate and hand back to the app.
  useEffect(() => {
    if (index >= steps.length && steps.length > 0) {
      bigConfetti()
      const t = setTimeout(() => onComplete(), 1100)
      return () => clearTimeout(t)
    }
  }, [index, steps.length, onComplete])

  const skip = () => {
    const final = Object.fromEntries(participants.map((p) => [p, []]))
    steps.forEach((s) => final[s.participant].push(s.team))
    setAssigned(final)
    setIndex(steps.length)
  }

  const current = steps[Math.min(index, steps.length - 1)]
  const done = index >= steps.length
  const progress = Math.min(index, steps.length)

  return (
    <div className="draw">
      <div className="draw-head">
        <div className="draw-progress">
          <span className="pool-pill">
            {done ? 'Complete' : current?.poolLabel}
          </span>
          <div className="bar">
            <div
              className="bar-fill"
              style={{ width: `${(progress / steps.length) * 100}%` }}
            />
          </div>
          <span className="count">
            {progress} / {steps.length}
          </span>
        </div>
        <div className="draw-controls">
          <button
            className="sound-btn"
            onClick={toggleMute}
            title={muted ? 'Unmute music' : 'Mute music'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <div className="speed">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                className={`speed-btn ${speed === s ? 'active' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </div>
          <button className="btn ghost sm" onClick={skip} disabled={done}>
            Skip ⏭
          </button>
        </div>
      </div>

      <div className="reveal">
        {done ? (
          <div className="reveal-done">
            <div className="big-check">✓</div>
            <h2>That's the draw!</h2>
            <p>Revealing the results…</p>
          </div>
        ) : (
          <div className={`reveal-card ${locked ? 'locked' : 'spinning'}`}>
            <Flag code={display?.code} name={display?.name} size="w320" className="reveal-flag" />
            <div className="reveal-name">{display?.name}</div>
            {locked && (
              <div className="reveal-to">
                <span className="arrow">→</span>
                <span className="reveal-player">{current?.participant}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="draw-board">
        {participants.map((p) => {
          const lastTeam = assigned[p][assigned[p].length - 1]
          const justGot = locked && current?.participant === p
          return (
            <div className={`board-col ${justGot ? 'flash' : ''}`} key={p}>
              <div className="board-name">
                {p}
                <span className="board-count">{assigned[p].length}</span>
              </div>
              <div className="board-flags">
                {assigned[p].map((t) => (
                  <span
                    className={`board-flag ${
                      justGot && t.code === lastTeam?.code ? 'pop' : ''
                    }`}
                    key={t.code}
                    title={t.name}
                  >
                    <Flag code={t.code} name={t.name} />
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function popConfetti() {
  confetti({
    particleCount: 22,
    spread: 55,
    startVelocity: 28,
    gravity: 0.9,
    scalar: 0.7,
    origin: { y: 0.35 },
    colors: ['#7b2d8e', '#a64ac9', '#f2c94c', '#ffffff'],
    disableForReducedMotion: true,
  })
}

function bigConfetti() {
  const burst = (opts) =>
    confetti({
      particleCount: 90,
      spread: 90,
      startVelocity: 45,
      colors: ['#7b2d8e', '#a64ac9', '#f2c94c', '#27ae60', '#ffffff'],
      disableForReducedMotion: true,
      ...opts,
    })
  burst({ origin: { x: 0.2, y: 0.5 } })
  burst({ origin: { x: 0.8, y: 0.5 } })
  burst({ origin: { x: 0.5, y: 0.3 } })
}
