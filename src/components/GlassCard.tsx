import type { CSSProperties, ReactNode } from 'react'

type GlassCardProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function GlassCard({ children, className = '', style }: GlassCardProps) {
  return (
    <div
      className={
        'rounded-[32px] border border-solid border-white/40 bg-white/25 backdrop-blur-md ' + className
      }
      style={{ boxShadow: '0px 24px 60px rgba(39,48,48,0.10)', ...style }}
    >
      {children}
    </div>
  )
}
