import { useCallback, useReducer } from 'react'

export type BreathPhase = 'in' | 'out'
export const TOTAL_CYCLES = 8

type SessionState = {
  /** Current breath phase. A session always starts on the inhale. */
  phase: BreathPhase
  /** Completed breath cycles (0–8). One cycle = one inhale + one exhale. */
  completedCycles: number
}

type SessionAction = { type: 'advance' } | { type: 'reset' }

const initialState: SessionState = { phase: 'in', completedCycles: 0 }

function reducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'advance':
      if (state.phase === 'in') {
        // Inhale → exhale: no cycle completed yet.
        return { phase: 'out', completedCycles: state.completedCycles }
      }
      // Exhale → inhale: one full cycle completed (capped at TOTAL_CYCLES).
      return { phase: 'in', completedCycles: Math.min(state.completedCycles + 1, TOTAL_CYCLES) }
    case 'reset':
      return initialState
  }
}

export type BreathSession = {
  phase: BreathPhase
  completedCycles: number
  /**
   * Advance the session by exactly one phase.
   * `in → out` flips the phase; `out → in` also completes a cycle.
   */
  advancePhase: () => void
  /** Reset to the initial state (inhale, zero completed cycles). */
  reset: () => void
}

export function useBreathSession(): BreathSession {
  const [state, dispatch] = useReducer(reducer, initialState)

  const advancePhase = useCallback(() => dispatch({ type: 'advance' }), [])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])

  return { phase: state.phase, completedCycles: state.completedCycles, advancePhase, reset }
}
