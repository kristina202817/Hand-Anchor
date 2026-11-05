// Single home for all audio. Quiet, looping background music for the session.

const MUSIC_URL =
  'https://res.cloudinary.com/cxqpf75x/video/upload/v1789640420/echoes_of_lumen-meditative-reflective-piano-quiet-mind-589281.mp3'

export const MUSIC_VOLUME = 0.08
export const FADE_IN_MS = 1000
export const FADE_OUT_MS = 1500

export type MusicState = 'idle' | 'loading' | 'playing' | 'fading'

let state: MusicState = 'idle'
export function getMusicState(): MusicState {
  return state
}

// --- Web Audio path ---------------------------------------------------------
let ctx: AudioContext | null = null
let buffer: AudioBuffer | null = null
let bufferPromise: Promise<AudioBuffer> | null = null
let source: AudioBufferSourceNode | null = null
let gain: GainNode | null = null
let fading = false
let cleanupTimer: ReturnType<typeof setTimeout> | null = null
let wantPlay = false

// --- HTMLAudio fallback -----------------------------------------------------
let useFallback = false
let audioEl: HTMLAudioElement | null = null
let rampRaf: number | null = null

function ensureCtx(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  return ctx
}

async function loadBuffer(): Promise<AudioBuffer> {
  try {
    const audioCtx = ensureCtx()
    const res = await fetch(MUSIC_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const arr = await res.arrayBuffer()
    const decoded = await audioCtx.decodeAudioData(arr)
    buffer = decoded
    if (state === 'loading' && !source) state = 'idle'
    return decoded
  } catch (err) {
    console.error('[Music] fetch/decode failed, using HTMLAudio fallback:', err)
    enableFallback()
    throw err
  }
}

/** Fetch + decode once, ahead of playback, so start() is instant. */
export function preload(): void {
  if (useFallback || bufferPromise || buffer) return
  state = 'loading'
  bufferPromise = loadBuffer().catch(() => {
    // handled in loadBuffer (fallback enabled); swallow to avoid unhandled rejection
    return null as unknown as AudioBuffer
  })
}

function playBuffer(): void {
  if (!ctx || !buffer || source) return
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, ctx.currentTime)
  g.gain.linearRampToValueAtTime(MUSIC_VOLUME, ctx.currentTime + FADE_IN_MS / 1000)
  const s = ctx.createBufferSource()
  s.buffer = buffer
  s.loop = true // seamless, gapless loop
  s.connect(g).connect(ctx.destination)
  s.start()
  source = s
  gain = g
  fading = false
  state = 'playing'
}

function hardStop(): void {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer)
    cleanupTimer = null
  }
  if (source) {
    try {
      source.stop()
    } catch {
      // already stopped
    }
    source.disconnect()
  }
  if (gain) gain.disconnect()
  source = null
  gain = null
  fading = false
}

/** Start (or restart) playback. Must be called from a user gesture. */
export function start(): void {
  wantPlay = true
  if (useFallback) {
    startFallback()
    return
  }
  const audioCtx = ensureCtx()
  audioCtx.resume().catch(() => {})

  if (source && !fading) return // already playing — never start a second source
  if (source && fading) hardStop() // cut the near-silent fade tail, then restart

  if (buffer) {
    playBuffer()
    return
  }
  state = 'loading'
  const p = bufferPromise ?? (bufferPromise = loadBuffer())
  p.then(() => {
    if (wantPlay && !source && !useFallback) playBuffer()
  }).catch(() => {
    if (wantPlay) startFallback()
  })
}

/** Fade the music out over `durationMs`, then stop and release the source. */
export function fadeOutAndStop(durationMs: number = FADE_OUT_MS): void {
  wantPlay = false
  if (useFallback) {
    fadeOutFallback(durationMs)
    return
  }
  if (!source || !gain || !ctx) {
    if (state !== 'loading') state = 'idle'
    return
  }
  if (fading) return
  fading = true
  state = 'fading'
  const now = ctx.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(0, now + durationMs / 1000)
  cleanupTimer = setTimeout(() => {
    hardStop()
    state = 'idle'
  }, durationMs + 60)
}

// --- Fallback implementation ------------------------------------------------
function enableFallback(): void {
  useFallback = true
}

function ensureAudioEl(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio(MUSIC_URL)
    audioEl.loop = true
    audioEl.preload = 'auto'
    audioEl.volume = 0
  }
  return audioEl
}

function rampVolume(el: HTMLAudioElement, to: number, ms: number, onDone?: () => void): void {
  if (rampRaf) cancelAnimationFrame(rampRaf)
  const from = el.volume
  const startTime = performance.now()
  const step = (now: number) => {
    const t = ms <= 0 ? 1 : Math.min((now - startTime) / ms, 1)
    el.volume = from + (to - from) * t
    if (t < 1) {
      rampRaf = requestAnimationFrame(step)
    } else {
      rampRaf = null
      onDone?.()
    }
  }
  rampRaf = requestAnimationFrame(step)
}

function startFallback(): void {
  const el = ensureAudioEl()
  if (state === 'playing' && !el.paused) return // already playing
  if (state === 'fading') el.currentTime = 0 // restart from the beginning
  el.volume = 0
  el.play().catch((err) => console.error('[Music] HTMLAudio play failed:', err))
  state = 'playing'
  rampVolume(el, MUSIC_VOLUME, FADE_IN_MS)
}

function fadeOutFallback(durationMs: number): void {
  if (!audioEl || state === 'idle') {
    state = 'idle'
    return
  }
  const el = audioEl
  state = 'fading'
  rampVolume(el, 0, durationMs, () => {
    el.pause()
    state = 'idle'
  })
}
