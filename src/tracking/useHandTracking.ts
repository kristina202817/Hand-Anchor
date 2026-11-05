import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

// Keep this in sync with the pinned dependency version in package.json.
const TASKS_VISION_VERSION = '0.10.21'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

/** Openness calibration: average tip-to-wrist ratio mapped linearly to 0–1. */
export const OPEN_MIN = 1.0
export const OPEN_MAX = 1.9

const EMA_ALPHA = 0.15 // smooth signal for sphere scale
const PHASE_EMA_ALPHA = 0.45 // faster signal for phase detection
const ABSENCE_MS = 500
const PANEL_INTERVAL_MS = 100 // throttle debug state updates to ~10/s
const FINGER_TIPS = [8, 12, 16, 20] as const

export type TrackingStatus = 'no-camera' | 'loading' | 'ready' | 'error'

/** Per-frame values, mutated in place so other loops can read them without re-rendering. */
export type TrackingFrame = {
  handOpenness: number // slow EMA — sphere scale
  phaseOpenness: number // fast EMA — phase detection
  rawOpenness: number
  handPresent: boolean
  fps: number
  status: TrackingStatus
}

export type HandTracking = {
  /** Live per-frame values (updated every detection frame). */
  frameRef: RefObject<TrackingFrame>
  // Throttled snapshots for the debug panel:
  status: TrackingStatus
  handPresent: boolean
  handOpenness: number
  rawOpenness: number
  fps: number
}

type Point = { x: number; y: number; z?: number }

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0))
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

async function createLandmarker(): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL)
  const options = { runningMode: 'VIDEO' as const, numHands: 1 }
  try {
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      ...options,
    })
  } catch {
    // Fall back to CPU where the GPU delegate is unavailable.
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
      ...options,
    })
  }
}

/**
 * Hand tracking off the shared camera stream. Loads the model as soon as a
 * stream is available and runs the detection loop only while `active`.
 * Live values live in `frameRef`; React state is updated only when
 * `handPresent` changes and at most ~10×/s for the debug panel.
 * The camera feed is never displayed. Returns idle values with no stream.
 */
export function useHandTracking(stream: MediaStream | null, active: boolean): HandTracking {
  const frameRef = useRef<TrackingFrame>({
    handOpenness: 0,
    phaseOpenness: 0,
    rawOpenness: 0,
    handPresent: false,
    fps: 0,
    status: 'no-camera',
  })

  const [status, setStatusState] = useState<TrackingStatus>('no-camera')
  const [handPresent, setHandPresent] = useState(false)
  const [rawOpenness, setRawOpenness] = useState(0)
  const [handOpenness, setHandOpenness] = useState(0)
  const [fps, setFps] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const loadingRef = useRef(false)

  const rafRef = useRef<number | null>(null)
  const lastVideoTime = useRef(-1)
  const lastSeen = useRef(0)
  const emaRef = useRef(0)
  const phaseEmaRef = useRef(0)
  const emaInit = useRef(false)
  const lastFrame = useRef(0)
  const lastPanel = useRef(0)

  const setStatus = (s: TrackingStatus) => {
    frameRef.current.status = s
    setStatusState(s)
  }

  const setPresent = (p: boolean) => {
    if (frameRef.current.handPresent !== p) {
      frameRef.current.handPresent = p
      setHandPresent(p) // state update only on change
    }
  }

  // Hidden video sink: rendered but invisible (1px, opacity 0), never display:none.
  useEffect(() => {
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.autoplay = true
    Object.assign(v.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '1px',
      height: '1px',
      opacity: '0',
      pointerEvents: 'none',
    })
    document.body.appendChild(v)
    videoRef.current = v
    return () => {
      v.srcObject = null
      v.remove()
      videoRef.current = null
    }
  }, [])

  // Attach the stream and start loading the model as soon as it is available.
  useEffect(() => {
    const v = videoRef.current
    if (!stream) {
      setStatus('no-camera')
      if (v) v.srcObject = null
      return
    }
    if (v) {
      v.srcObject = stream
      v.play().catch(() => {})
    }
    if (landmarkerRef.current) {
      setStatus('ready')
      return
    }
    if (loadingRef.current) {
      setStatus('loading')
      return
    }
    loadingRef.current = true
    setStatus('loading')
    createLandmarker()
      .then((lm) => {
        landmarkerRef.current = lm
        setStatus('ready')
      })
      .catch((err) => {
        console.error('[HandTracking] failed to load model', err)
        setStatus('error')
      })
      .finally(() => {
        loadingRef.current = false
      })
  }, [stream])

  // Detection loop: only while Session is active, the model is ready and the tab is visible.
  useEffect(() => {
    if (!active || status !== 'ready' || !stream) return
    const v = videoRef.current
    const lm = landmarkerRef.current
    if (!v || !lm) return

    let stopped = false

    const tick = () => {
      if (stopped) return
      rafRef.current = requestAnimationFrame(tick)
      if (document.hidden) return
      if (v.readyState < 2) return
      if (v.currentTime === lastVideoTime.current) return
      lastVideoTime.current = v.currentTime

      const now = performance.now()
      if (lastFrame.current) {
        const dt = now - lastFrame.current
        if (dt > 0) {
          const instant = 1000 / dt
          frameRef.current.fps = Math.round(
            frameRef.current.fps ? frameRef.current.fps * 0.8 + instant * 0.2 : instant,
          )
        }
      }
      lastFrame.current = now

      const result = lm.detectForVideo(v, now)
      const hand = result.landmarks?.[0]
      if (hand && hand.length >= 21) {
        const base = dist(hand[0], hand[9]) || 1e-6
        const avg = FINGER_TIPS.reduce((sum, i) => sum + dist(hand[i], hand[0]) / base, 0) / FINGER_TIPS.length
        const raw = clamp01((avg - OPEN_MIN) / (OPEN_MAX - OPEN_MIN))

        emaRef.current = emaInit.current ? emaRef.current + EMA_ALPHA * (raw - emaRef.current) : raw
        phaseEmaRef.current = emaInit.current
          ? phaseEmaRef.current + PHASE_EMA_ALPHA * (raw - phaseEmaRef.current)
          : raw
        emaInit.current = true

        frameRef.current.rawOpenness = raw
        frameRef.current.handOpenness = emaRef.current
        frameRef.current.phaseOpenness = phaseEmaRef.current
        lastSeen.current = now
        setPresent(true)
      } else if (now - lastSeen.current > ABSENCE_MS) {
        setPresent(false)
      }

      // Throttled snapshot for the debug panel (~10/s).
      if (now - lastPanel.current >= PANEL_INTERVAL_MS) {
        lastPanel.current = now
        setRawOpenness(frameRef.current.rawOpenness)
        setHandOpenness(frameRef.current.handOpenness)
        setFps(frameRef.current.fps)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      stopped = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastVideoTime.current = -1
      lastFrame.current = 0
    }
  }, [active, status, stream])

  return { frameRef, status, handPresent, handOpenness, rawOpenness, fps }
}
