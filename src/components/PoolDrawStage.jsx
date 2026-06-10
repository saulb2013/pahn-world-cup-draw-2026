import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { TEAMS } from '../data/teams.js'
import { createMusic } from '../lib/music.js'
import { teamByCode } from '../lib/poolgame.js'
import { POOL_PTS } from '../data/pools.js'
import Flag from './Flag.jsx'

// Phase timings (ms) at 1x speed.
const SHUFFLE_MS = 750
const HOLD_MS = 950
const FLICKER_MS = 55

// Animated reveal for the pool game's random draw — one team per pool dealt to
// each player, pool by pool. Mirrors the sweepstake DrawStage.
export default function PoolDrawStage({ steps, participants, onComplete }) {
  const [index, setIndex] = useState(0)
  const [display, setDisplay] = useState(() => teamByCode(steps[0]?.code))
  const [locked, setLocked] = useState(false)
  const [assigned, setAssigned] = useState(() =>
    Object.fromEntries(participants.map((p) => [p, []])),
  )
  const [speed, setSpeed] = useState(1)
  const speedRef = useRef(speed)
  speedRef.current = speed

  const [muted, setMuted] = useState(false)
  const musicRef = useRef(null)

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
      setDisplay(teamByCode(step.code))
      setLocked(true)
      popConfetti()
    }, SHUFFLE_MS / speedRef.current)

    const nextTimer = setTimeout(
      () => {
        setAssigned((prev) => ({
          ...prev,
          [step.player]: [...prev[step.player], step.code],
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

  useEffect(() => {
    if (index >= steps.length && steps.length > 0) {
      bigConfetti()
      const t = setTimeout(() => onComplete(), 1100)
      return () => clearTimeout(t)
    }
  }, [index, steps.length, onComplete])

  const skip = () => {
    const final = Object.fromEntries(participants.map((p) => [p, []]))
    steps.forEach((s) => final[s.player].push(s.code))
    setAssigned(final)
    setIndex(steps.length)
  }

  const current = steps[Math.min(index, steps.length - 1)]
  const done = index >= steps.length
  const progress = Math.min(index, steps.length)
  const team = display

  return (
    <div className="draw">
      <div className="draw-head">
        <div className="draw-progress">
          <span className="pool-pill">
            {done ? 'Complete' : `Pool ${current?.letter}`}
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
            <Flag code={team?.code} name={team?.name} size="w320" className="reveal-flag" />
            <div className="reveal-name">{team?.name}</div>
            {locked && (
              <div className="reveal-to">
                <span className="arrow">→</span>
                <span className="reveal-player">{current?.player}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="draw-board">
        {participants.map((p) => {
          const last = assigned[p][assigned[p].length - 1]
          const justGot = locked && current?.player === p
          return (
            <div className={`board-col ${justGot ? 'flash' : ''}`} key={p}>
              <div className="board-name">
                {p}
                <span className="board-count">{assigned[p].length}</span>
              </div>
              <div className="board-flags">
                {assigned[p].map((code) => {
                  const t = teamByCode(code)
                  return (
                    <span
                      className={`board-flag ${justGot && code === last ? 'pop' : ''}`}
                      key={code}
                      title={`${t?.name} · ranking ${POOL_PTS[code]}`}
                    >
                      <Flag code={code} name={t?.name} />
                    </span>
                  )
                })}
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
    colors: ['#ffffff', '#f2c94c', '#b9b9b9', '#888888'],
    disableForReducedMotion: true,
  })
}

function bigConfetti() {
  const burst = (opts) =>
    confetti({
      particleCount: 90,
      spread: 90,
      startVelocity: 45,
      colors: ['#ffffff', '#f2c94c', '#27ae60', '#b9b9b9'],
      disableForReducedMotion: true,
      ...opts,
    })
  burst({ origin: { x: 0.2, y: 0.5 } })
  burst({ origin: { x: 0.8, y: 0.5 } })
  burst({ origin: { x: 0.5, y: 0.3 } })
}
