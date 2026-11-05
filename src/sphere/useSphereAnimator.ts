import { useEffect } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import type { BreathPhase } from '../session'
import type { TrackingFrame } from '../tracking/useHandTracking'

// --- Sphere scale constants -------------------------------------------------
export const IDLE_SCALE = 0.7 // Session with no hand / no camera
export const MIN_SCALE = 0.39 // fist — "Breathe out..." size
export const MAX_SCALE = 1.0 // open palm at rest (Access / How it works)
export const MAX_SESSION_SCALE = 1.15 // full inhale during a session
export const FULL_OPEN = 0.9 // openness treated as a full open palm
export const TAU_ACTIVE = 0.35 // smoothing time constant while a hand is present
export const TAU_IDLE = 0.8 // smoothing while entering Session / hand lost

// --- Breath phase thresholds & timings --------------------------------------
export const OPEN_THRESHOLD = 0.75 // in → out once the hand is fully open
export const CLOSE_THRESHOLD = 0.25 // out → in once the hand is closed
export const ARM_THRESHOLD = 0.5 // an inhale must dip below this to be completable
export const HOLD_MS = 120 // value must stay past a threshold this long
export const MIN_PHASE_MS = 800 // a phase must last at least this long

const MIN_TARGET_DELTA = 0.01 // ignore smaller target changes (jitter)
const MAX_DT = 0.1 // clamp dt after tab was hidden

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export type SphereDebug = {
  targetScale: number
  currentScale: number
  holdMs: number
  inhaleArmed: boolean
}

type AnimatorOptions = {
  containerRef: RefObject<HTMLDivElement | null>
  frameRef: RefObject<TrackingFrame>
  phaseRef: MutableRefObject<BreathPhase>
  screenRef: MutableRefObject<string>
  advancePhase: () => void
  debugRef: MutableRefObject<SphereDebug>
}

/**
 * Single rAF loop that owns the sphere scale (written directly to the
 * container transform) and drives the breath phase from hand openness.
 * Runs continuously; reads everything from refs so App never re-renders per frame.
 */
export function useSphereAnimator({
  containerRef,
  frameRef,
  phaseRef,
  screenRef,
  advancePhase,
  debugRef,
}: AnimatorOptions) {
  useEffect(() => {
    let raf = 0
    let last = performance.now()

    let current = 1.0
    let target = 1.0

    let prevScreen = screenRef.current
    let prevPhase = phaseRef.current
    let phaseStart = performance.now()
    let holdStart: number | null = null
    let inhaleArmed = false

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, MAX_DT)
      last = now

      const frame = frameRef.current
      const screen = screenRef.current
      const inSession = screen === 'session'
      const hasHand = inSession && frame.handPresent

      // Reset phase-detection state when (re)entering a session.
      if (inSession && prevScreen !== 'session') {
        phaseStart = now
        holdStart = null
        inhaleArmed = false
        prevPhase = phaseRef.current
      }
      prevScreen = screen

      // React to any phase change (hand-driven, N key, or reset).
      if (phaseRef.current !== prevPhase) {
        prevPhase = phaseRef.current
        phaseStart = now
        holdStart = null
        if (phaseRef.current === 'in') inhaleArmed = false
      }

      // --- Target scale ---
      let rawTarget: number
      if (inSession) {
        rawTarget = hasHand
          ? MIN_SCALE + clamp01(frame.handOpenness / FULL_OPEN) * (MAX_SESSION_SCALE - MIN_SCALE)
          : IDLE_SCALE
      } else {
        rawTarget = 1.0
      }
      if (Math.abs(rawTarget - target) >= MIN_TARGET_DELTA) target = rawTarget

      // --- Frame-rate-independent smoothing ---
      const tau = hasHand ? TAU_ACTIVE : TAU_IDLE
      const factor = 1 - Math.exp(-dt / tau)
      current += (target - current) * factor
      const el = containerRef.current
      if (el) el.style.transform = `scale(${current})`

      // --- Breath phase from the hand ---
      if (hasHand) {
        const o = frame.phaseOpenness // fast signal for responsive phase changes
        const phase = phaseRef.current
        const phaseElapsed = now - phaseStart

        if (phase === 'in') {
          if (o < ARM_THRESHOLD) inhaleArmed = true
          const cond = o >= OPEN_THRESHOLD && inhaleArmed
          if (cond) {
            if (holdStart == null) holdStart = now
            if (now - holdStart >= HOLD_MS && phaseElapsed >= MIN_PHASE_MS) {
              advancePhase() // in → out
              phaseRef.current = 'out' // optimistic; reconciled next render
              holdStart = null
            }
          } else {
            holdStart = null
          }
        } else {
          const cond = o <= CLOSE_THRESHOLD
          if (cond) {
            if (holdStart == null) holdStart = now
            if (now - holdStart >= HOLD_MS && phaseElapsed >= MIN_PHASE_MS) {
              advancePhase() // out → in (completes a cycle)
              phaseRef.current = 'in'
              holdStart = null
            }
          } else {
            holdStart = null
          }
        }
      } else {
        // Hand lost: freeze phase logic and reset the hold timer.
        holdStart = null
      }

      debugRef.current.targetScale = target
      debugRef.current.currentScale = current
      debugRef.current.holdMs = holdStart == null ? 0 : Math.round(now - holdStart)
      debugRef.current.inhaleArmed = inhaleArmed
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [containerRef, frameRef, phaseRef, screenRef, advancePhase, debugRef])
}
