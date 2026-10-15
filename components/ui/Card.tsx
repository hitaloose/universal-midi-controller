import type { ReactNode } from 'react'

export function Card({
  label,
  className = '',
  children,
}: {
  label?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section aria-label={label} className={`bg-surface border border-line-soft rounded-card p-[18px] flex flex-col gap-3.5 ${className}`}>
      {children}
    </section>
  )
}

/** Small caps heading used on every card and pad group. */
export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`m-0 text-[13px] font-bold tracking-[0.14em] uppercase ${className}`}>{children}</h2>
}

/** Field label above an input. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-semibold tracking-[0.1em] uppercase text-ink-dim">{children}</span>
}

export function Hint({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`text-[13px] leading-normal text-ink-dim ${className}`}>{children}</span>
}

export const inputClass =
  'box-border h-11 rounded-control border border-line bg-ground text-ink px-3 text-[15px] font-semibold min-w-0 focus:outline-2 focus:outline-preset focus:outline-offset-1'

export const monoInputClass = `${inputClass} font-mono font-bold`
