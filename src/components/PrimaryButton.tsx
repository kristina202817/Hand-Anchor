import type { ButtonHTMLAttributes } from 'react'

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
}

export function PrimaryButton({ loading = false, className = '', children, disabled, style, ...rest }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={
        'flex items-center justify-center rounded-[32px] bg-[#bee3dc] px-[28px] py-[16px] ' +
        "font-['Manrope:Medium'] text-[20px] font-medium text-[#34413e] whitespace-nowrap " +
        'transition-[transform,filter,opacity] duration-150 ease-out ' +
        'hover:brightness-105 active:translate-y-[1px] active:brightness-95 ' +
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34413e] ' +
        'disabled:cursor-default disabled:opacity-70 ' +
        className
      }
      style={{ boxShadow: '0px 4px 2px rgba(39,48,48,0.25)', ...style }}
      {...rest}
    >
      {loading ? 'Requesting…' : children}
    </button>
  )
}
