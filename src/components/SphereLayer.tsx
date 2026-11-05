import type { RefObject } from 'react'

const SPHERE_IMG = '/assets/14e1e.png'
const SPHERE_VIDEO =
  'https://res.cloudinary.com/cxqpf75x/video/upload/v1789640433/kling_20260917_VIDEO_Animate_th_739_0.mp4'

// Soft radial edge mask so the opaque MP4 reads as a floating sphere.
const RADIAL_MASK = 'radial-gradient(circle at 50% 50%, #000 54%, rgba(0,0,0,0) 74%)'

export type SphereMode = 'image' | 'video'

type SphereLayerProps = {
  /** The sphere scale is written directly to this container's transform by the animator. */
  containerRef: RefObject<HTMLDivElement | null>
  mode: SphereMode
  visible: boolean
}

/**
 * Persistent gradient sphere. Stays mounted across every screen; only its
 * source (image ↔ video) and visibility change here — the scale transform is
 * owned by useSphereAnimator via `containerRef`.
 */
export function SphereLayer({ containerRef, mode, visible }: SphereLayerProps) {
  return (
    <div
      ref={containerRef}
      aria-hidden
      className="absolute"
      style={{
        left: 460,
        top: 150,
        width: 520,
        height: 520,
        transformOrigin: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 1s ease',
      }}
    >
      {/* Static sphere */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ opacity: mode === 'image' ? 1 : 0, transition: 'opacity 0.6s ease' }}
      >
        <img
          src={SPHERE_IMG}
          alt=""
          className="absolute max-w-none"
          style={{ height: '146.49%', width: '146.92%', left: '-23.39%', top: '-21.6%' }}
        />
      </div>

      {/* Looping video sphere, masked to a soft circle. Plays continuously. */}
      <div
        className="absolute inset-0"
        style={{
          opacity: mode === 'video' ? 1 : 0,
          transition: 'opacity 0.6s ease',
          WebkitMaskImage: RADIAL_MASK,
          maskImage: RADIAL_MASK,
        }}
      >
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={SPHERE_VIDEO}
          muted
          autoPlay
          loop
          playsInline
        />
      </div>
    </div>
  )
}
