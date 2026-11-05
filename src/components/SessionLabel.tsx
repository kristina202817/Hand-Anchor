import type { BreathPhase } from '../session'

type SessionLabelProps = {
  phase: BreathPhase
}

export function SessionLabel({ phase }: SessionLabelProps) {
  const text = phase === 'in' ? 'Breathe in...' : 'Breathe out...'
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute left-1/2 top-[72px] flex -translate-x-1/2 justify-center"
      style={{ width: 320, height: 44 }}
    >
      {/* key remount crossfades the label (~400ms) whenever the phase flips */}
      <p
        key={phase}
        className="fx-fade-in-label font-['Manrope:Medium'] text-[32px] font-medium text-[#34413e] text-center whitespace-nowrap"
      >
        {text}
      </p>
    </div>
  )
}
