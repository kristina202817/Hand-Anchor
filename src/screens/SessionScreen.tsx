import { ProgressDots } from '../components/ProgressDots'
import { SessionLabel } from '../components/SessionLabel'
import type { BreathPhase } from '../session'

type SessionScreenProps = {
  phase: BreathPhase
  completedCycles: number
}

/** Foreground for the guided breathing session (the sphere lives in SphereLayer). */
export function SessionScreen({ phase, completedCycles }: SessionScreenProps) {
  return (
    <>
      <SessionLabel phase={phase} />
      <ProgressDots completedCycles={completedCycles} />
    </>
  )
}
