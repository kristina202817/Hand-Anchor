import type { ReactNode } from 'react'
import { GlassCard } from '../components/GlassCard'
import { PrimaryButton } from '../components/PrimaryButton'

type AccessScreenProps = {
  heading: string
  body: ReactNode
  buttonLabel: string
  loading?: boolean
  onAction: () => void
}

/** Shared layout for the "Access" permission screen and its denied/error states. */
export function AccessScreen({ heading, body, buttonLabel, loading, onAction }: AccessScreenProps) {
  return (
    <GlassCard
      className="absolute left-1/2 top-[230px] flex w-[730px] -translate-x-1/2 flex-col items-center gap-[48px] px-[32px] py-[56px]"
      style={{}}
    >
      <div className="flex w-full flex-col items-center gap-[24px] text-center text-[#34413e]">
        <h1 className="w-full font-['Manrope:SemiBold'] text-[32px] font-semibold leading-normal">{heading}</h1>
        <div className="w-full font-['Manrope:Regular'] text-[16px] font-normal leading-[1.5]">{body}</div>
      </div>
      <PrimaryButton loading={loading} onClick={onAction}>
        {buttonLabel}
      </PrimaryButton>
    </GlassCard>
  )
}
