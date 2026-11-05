import type { ButtonHTMLAttributes } from 'react'

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export function SecondaryButton({ className = '', children, style, ...rest }: SecondaryButtonProps) {
  return (
    <button
      type="button"
      className={
        'flex items-center justify-center rounded-[32px] border border-solid border-[#bee3dc] bg-transparent px-[28px] py-[16px] ' +
        "font-['Manrope:Medium'] text-[20px] font-medium text-[#34413e] whitespace-nowrap " +
        'transition-[transform,background-color] duration-150 ease-out ' +
        'hover:bg-[#bee3dc]/25 active:translate-y-[1px] active:bg-[#bee3dc]/40 ' +
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34413e] ' +
        className
      }
      style={{ boxShadow: '0px 4px 4px rgba(39,48,48,0.25)', ...style }}
      {...rest}
    >
      {children}
    </button>
  )
}
