import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SphereLayer, type SphereMode } from './components/SphereLayer'
import { AccessScreen } from './screens/AccessScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { SessionScreen } from './screens/SessionScreen'
import { FinishScreen } from './screens/FinishScreen'
import { TOTAL_CYCLES, useBreathSession, type BreathPhase } from './session'
import { useHandTracking } from './tracking/useHandTracking'
import { useSphereAnimator, type SphereDebug } from './sphere/useSphereAnimator'
import * as music from './audio/backgroundMusic'

const BG_IMG = '/assets/a41ac.png'

type Screen = 'access' | 'denied' | 'onboarding' | 'session' | 'finish'
type CameraErrorKind = 'permission' | 'other'

/** Crossfades foreground content whenever `activeKey` changes (~500ms). */
function Crossfade({ activeKey, children }: { activeKey: string; children: ReactNode }) {
  const [outgoing, setOutgoing] = useState<{ key: string; node: ReactNode } | null>(null)
  const prev = useRef<{ key: string; node: ReactNode }>({ key: activeKey, node: children })

  useEffect(() => {
    if (prev.current.key !== activeKey) {
      setOutgoing(prev.current)
      const t = setTimeout(() => setOutgoing(null), 600)
      prev.current = { key: activeKey, node: children }
      return () => clearTimeout(t)
    }
    prev.current = { key: activeKey, node: children }
  }, [activeKey, children])

  return (
    <>
      {outgoing && (
        <div key={`out-${outgoing.key}`} className="fx-fade-out absolute inset-0">
          {outgoing.node}
        </div>
      )}
      <div key={`in-${activeKey}`} className="fx-fade-in absolute inset-0">
        {children}
      </div>
    </>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('access')
  const [errorKind, setErrorKind] = useState<CameraErrorKind | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const session = useBreathSession()

  // Hand tracking runs off the shared stream; it loads once granted and
  // detects only during Session.
  const tracking = useHandTracking(stream, screen === 'session')

  // Refs read by the per-frame sphere animator (keeps App off the frame path).
  const sphereContainerRef = useRef<HTMLDivElement | null>(null)
  const screenRef = useRef<Screen>(screen)
  screenRef.current = screen
  const phaseRef = useRef<BreathPhase>(session.phase)
  phaseRef.current = session.phase
  const sphereDebugRef = useRef<SphereDebug>({
    targetScale: 1,
    currentScale: 1,
    holdMs: 0,
    inhaleArmed: false,
  })

  useSphereAnimator({
    containerRef: sphereContainerRef,
    frameRef: tracking.frameRef,
    phaseRef,
    screenRef,
    advancePhase: session.advancePhase,
    debugRef: sphereDebugRef,
  })

  // Uniform fit of the 1440×820 stage into the viewport (1024–1920 and beyond).
  const [fit, setFit] = useState(1)
  useEffect(() => {
    const update = () => setFit(Math.min(window.innerWidth / 1440, window.innerHeight / 820))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
  }

  // Keep the stream alive for the whole app; only release it on unmount.
  useEffect(() => stopCamera, [])

  const requestCamera = async () => {
    if (requesting) return
    setRequesting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream // kept alive; feed is never displayed
      setStream(stream) // triggers model loading so tracking is ready by Session
      music.preload() // decode the track now so playback starts instantly
      setErrorKind(null)
      setScreen('onboarding')
    } catch (err) {
      const name = (err as DOMException | undefined)?.name
      setErrorKind(name === 'NotAllowedError' || name === 'SecurityError' ? 'permission' : 'other')
      setScreen('denied')
    } finally {
      setRequesting(false)
    }
  }

  const beginSession = () => {
    music.start() // inside the click gesture, so the AudioContext can resume
    session.reset()
    setScreen('session')
  }

  const restartSession = () => {
    music.start() // restart the track from the beginning
    session.reset() // reuse the existing camera stream, skip onboarding
    setScreen('session')
  }

  const finishDone = () => {
    music.fadeOutAndStop()
    stopCamera()
    session.reset()
    setScreen('access')
  }

  // After the 8th cycle, settle for ~1.5s then move to Finish.
  useEffect(() => {
    if (screen === 'session' && session.completedCycles >= TOTAL_CYCLES) {
      const t = setTimeout(() => setScreen('finish'), 1500)
      return () => clearTimeout(t)
    }
  }, [screen, session.completedCycles])

  // Fade the music out whenever Finish appears (auto transition or dev key 5).
  useEffect(() => {
    if (screen === 'finish') music.fadeOutAndStop()
  }, [screen])

  // Single source of truth for the persistent sphere.
  const sphereVisible = screen !== 'finish'
  const sphereMode: SphereMode = screen === 'session' ? 'video' : 'image'

  const foreground = (() => {
    switch (screen) {
      case 'access':
        return (
          <AccessScreen
            heading="One quick thing"
            body={
              <>
                <p className="mb-0">
                  Hand Anchor uses your camera to notice the natural movement of your hand as you breathe — that&rsquo;s
                  all it&rsquo;s for. Nothing is recorded, saved, or sent anywhere.
                </p>
                <p>It all stays right here, on your device.</p>
              </>
            }
            buttonLabel="Allow camera access"
            loading={requesting}
            onAction={requestCamera}
          />
        )
      case 'denied':
        return (
          <AccessScreen
            heading={errorKind === 'other' ? 'No camera found' : 'Camera is off'}
            body={
              errorKind === 'other'
                ? "Hand Anchor couldn't find a camera to use. Connect a camera, then try again."
                : "Hand Anchor needs your camera to follow your hand. Allow access in your browser's site settings, then try again."
            }
            buttonLabel="Try again"
            loading={requesting}
            onAction={requestCamera}
          />
        )
      case 'onboarding':
        return <OnboardingScreen onBegin={beginSession} />
      case 'session':
        return <SessionScreen phase={session.phase} completedCycles={session.completedCycles} />
      case 'finish':
        return <FinishScreen onDone={finishDone} onAgain={restartSession} />
    }
  })()

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#cfe3d8]">
      {/* Single background, covering the whole viewport with no seams or bands */}
      <img src={BG_IMG} alt="" className="absolute inset-0 h-full w-full object-cover" />

      {/* 1440×820 design stage, uniformly scaled and centered over the background */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: 1440, height: 820, transform: `translate(-50%, -50%) scale(${fit})`, transformOrigin: 'center' }}
      >
        <SphereLayer containerRef={sphereContainerRef} mode={sphereMode} visible={sphereVisible} />
        <Crossfade activeKey={screen}>{foreground}</Crossfade>
      </div>
    </div>
  )
}
