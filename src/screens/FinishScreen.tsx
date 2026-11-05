import { GlassCard } from '../components/GlassCard'
import { PrimaryButton } from '../components/PrimaryButton'
import { SecondaryButton } from '../components/SecondaryButton'

type FinishScreenProps = {
  onDone: () => void
  onAgain: () => void
}

export function FinishScreen({ onDone, onAgain }: FinishScreenProps) {
  return (
    <GlassCard className="absolute left-1/2 top-1/2 flex w-[487px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[30px] px-[32px] py-[56px]">
      <div className="flex w-full flex-col items-center gap-[24px] text-center text-[#34413e]">
        <h1 className="w-full font-['Manrope:SemiBold'] text-[32px] font-semibold leading-normal">You're steady now</h1>
        <div className="w-full font-['Manrope:Regular'] text-[16px] font-normal leading-[1.5]">
          Well done. You can come back here anytime you need this again.
        </div>
      </div>
      <div className="flex w-[250px] flex-col items-stretch gap-[24px]">
        <PrimaryButton className="w-full" onClick={onDone}>
          Done
        </PrimaryButton>
        <SecondaryButton className="w-full" onClick={onAgain}>
          Do it again
        </SecondaryButton>
      </div>
    </GlassCard>
  )
}
