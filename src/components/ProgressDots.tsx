import { TOTAL_CYCLES } from '../session'

type ProgressDotsProps = {
  completedCycles: number
}

export function ProgressDots({ completedCycles }: ProgressDotsProps) {
  return (
    <div
      role="group"
      aria-label={`${completedCycles} of ${TOTAL_CYCLES} breaths complete`}
      className="absolute left-1/2 top-[730px] flex -translate-x-1/2 items-center gap-[6px]"
    >
      {Array.from({ length: TOTAL_CYCLES }, (_, i) => {
        const filled = i < completedCycles
        return (
          <span
            key={i}
            aria-hidden
            className="rounded-full border border-solid border-[#bee3dc] transition-colors duration-300 ease-out"
            style={{
              width: 18,
              height: 18,
              backgroundColor: filled ? '#bee3dc' : 'transparent',
            }}
          />
        )
      })}
    </div>
  )
}
