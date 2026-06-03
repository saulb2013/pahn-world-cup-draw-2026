// A small, self-contained "stadium anthem" generated with the Web Audio API —
// an uplifting I–V–vi–IV progression with a four-on-the-floor beat. No audio
// files to host or load; it just plays while the live draw runs. Starts from a
// user gesture (the "Start the draw" click) so autoplay rules are satisfied.

const TEMPO = 124
const STEP_DUR = 60 / TEMPO / 4 // 16th note
const LOOKAHEAD = 0.1
const SCHEDULE_MS = 25

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12)

// I–V–vi–IV in C, one bar each. [chord notes (midi), bass root]
const PROG = [
  { chord: [60, 64, 67], bass: 36 }, // C
  { chord: [67, 71, 74], bass: 43 }, // G
  { chord: [57, 60, 64], bass: 45 }, // Am
  { chord: [65, 69, 72], bass: 41 }, // F
]

export function createMusic() {
  let ctx = null
  let master = null
  let noise = null
  let timer = null
  let step = 0
  let nextTime = 0
  let muted = false

  const ensure = () => {
    if (ctx) return
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = 0.0
    const comp = ctx.createDynamicsCompressor()
    master.connect(comp).connect(ctx.destination)
    master._comp = comp

    // reusable white-noise buffer
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    noise = buf
  }

  const env = (gain, t, a, d, peak) => {
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(peak, t + a)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
  }

  const kick = (t) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12)
    env(g, t, 0.005, 0.16, 0.9)
    o.connect(g).connect(master)
    o.start(t); o.stop(t + 0.2)
  }

  const hat = (t, open) => {
    const s = ctx.createBufferSource()
    s.buffer = noise
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'; hp.frequency.value = 8000
    const g = ctx.createGain()
    env(g, t, 0.002, open ? 0.12 : 0.03, 0.18)
    s.connect(hp).connect(g).connect(master)
    s.start(t); s.stop(t + 0.2)
  }

  const snare = (t) => {
    const s = ctx.createBufferSource()
    s.buffer = noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'; bp.frequency.value = 1800
    const g = ctx.createGain()
    env(g, t, 0.002, 0.14, 0.35)
    s.connect(bp).connect(g).connect(master)
    s.start(t); s.stop(t + 0.25)
  }

  const bass = (t, note) => {
    const o = ctx.createOscillator()
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'; lp.frequency.value = 600
    const g = ctx.createGain()
    o.type = 'sawtooth'; o.frequency.value = midi(note)
    env(g, t, 0.01, 0.32, 0.4)
    o.connect(lp).connect(g).connect(master)
    o.start(t); o.stop(t + 0.4)
  }

  const pluck = (t, note) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'triangle'; o.frequency.value = midi(note + 12)
    env(g, t, 0.006, 0.34, 0.22)
    o.connect(g).connect(master)
    o.start(t); o.stop(t + 0.4)
  }

  const scheduleStep = (s, t) => {
    const beat = s % 16
    const bar = Math.floor(s / 16) % PROG.length
    const { chord, bass: root } = PROG[bar]

    if (beat % 4 === 0) kick(t)
    hat(t, beat % 4 === 2)
    if (beat === 4 || beat === 12) snare(t)
    if (beat === 0 || beat === 8) bass(t, root)
    if (beat === 6) bass(t, root + 12)
    // arpeggiate the chord across the bar
    if (beat % 4 === 0) pluck(t, chord[(beat / 4) % chord.length])
    if (beat === 14) pluck(t, chord[2])
  }

  const loop = () => {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      scheduleStep(step, nextTime)
      nextTime += STEP_DUR
      step = (step + 1) % (16 * PROG.length)
    }
    timer = setTimeout(loop, SCHEDULE_MS)
  }

  return {
    start() {
      ensure()
      if (ctx.state === 'suspended') ctx.resume()
      step = 0
      nextTime = ctx.currentTime + 0.08
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setValueAtTime(0.0001, ctx.currentTime)
      if (!muted)
        master.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + 1.2)
      if (timer) clearTimeout(timer)
      loop()
    },
    stop() {
      if (!ctx) return
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8)
      if (timer) { clearTimeout(timer); timer = null }
    },
    setMuted(m) {
      muted = m
      if (!ctx) return
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.exponentialRampToValueAtTime(
        m ? 0.0001 : 0.32,
        ctx.currentTime + 0.3,
      )
    },
    isMuted: () => muted,
  }
}
