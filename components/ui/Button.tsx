import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'edit'
type Size = 'md' | 'lg' | 'sm'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-preset text-preset-ink border border-preset-hi hover:brightness-105 font-bold',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2 font-semibold',
  ghost: 'bg-transparent text-ink border border-line hover:bg-surface font-semibold',
  danger: 'bg-rec/10 text-panic border border-rec/50 hover:bg-rec/20 font-bold',
  edit: 'bg-edit text-[#06121F] border border-edit hover:brightness-105 font-bold',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-[13px]',
  lg: 'h-13 px-7 text-[15px]',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }

export function Button({ variant = 'secondary', size = 'md', className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-control transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  )
}
