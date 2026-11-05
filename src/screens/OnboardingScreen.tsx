import { GlassCard } from '../components/GlassCard'
import { PrimaryButton } from '../components/PrimaryButton'

const IMG_OPEN_PALM = '/assets/6cecf.png'
const IMG_FIST = '/assets/c5116.png'

type OnboardingScreenProps = {
  onBegin: () => void
}

export function OnboardingScreen({ onBegin }: OnboardingScreenProps) {
  return (
    <div className="absolute left-1/2 top-1/2 flex w-[686px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[72px]">
      <div className="flex w-full items-center gap-[48px]">
        <GlassCard className="flex h-[357px] w-[319px] flex-col items-center gap-[12px] p-[24px]">
          <ol className="w-full list-decimal ps-[24px] font-['Manrope:Regular'] text-[16px] font-normal leading-[1.5] text-[#34413e]">
            <li>Show your palm to the camera</li>
            <li>Open your hand slowly as you breathe in</li>
          </ol>
          <div className="relative h-[218px] w-[141px] overflow-hidden">
            <img
              src={IMG_OPEN_PALM}
              alt="An open palm facing the camera, fingers naturally extended"
              className="absolute max-w-none"
              style={{ height: '145.57%', width: '150.32%', left: '-22.13%', top: '-17.96%' }}
            />
          </div>
        </GlassCard>

        <GlassCard className="flex h-[357px] w-[319px] flex-col items-center justify-center gap-[52px] p-[24px]">
          <p className="w-full font-['Manrope:Regular'] text-[16px] font-normal leading-[1.5] text-[#34413e]">
            3. Close it slowly as you breathe out
          </p>
          <div className="relative h-[220px] w-[136px] overflow-hidden">
            <img
              src={IMG_FIST}
              alt="A hand gently closed into a relaxed fist, viewed from the front"
              className="absolute max-w-none"
              style={{ height: '185.44%', width: '200.24%', left: '-49.58%', top: '-48.29%' }}
            />
          </div>
        </GlassCard>
      </div>

      <PrimaryButton className="w-[250px]" onClick={onBegin}>
        Let's Begin
      </PrimaryButton>
    </div>
  )
}
