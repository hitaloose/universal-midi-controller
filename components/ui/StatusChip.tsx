import type { ReactNode } from 'react'

type Tone = 'mint' | 'red' | 'amber' | 'violet' | 'blue' | 'dim'

const TONES: Record<Tone, { text: string; bg: string; dot: string }> = {
  mint: { text: 'text-fx', bg: 'bg-fx/12', dot: 'bg-fx' },
  red: { text: 'text-panic', bg: 'bg-rec/15', dot: 'bg-[#FF5C61]' },
  amber: { text: 'text-preset', bg: 'bg-preset/12', dot: 'bg-preset' },
  violet: { text: 'text-solo', bg: 'bg-solo/12', dot: 'bg-solo' },
  blue: { text: 'text-edit', bg: 'bg-edit/12', dot: 'bg-edit' },
  dim: { text: 'text-ink-dim', bg: 'bg-surface-2', dot: 'bg-ink-mute' },
}

export function StatusChip({ tone, children, pulse }: { tone: Tone; children: ReactNode; pulse?: boolean }) {
  const t = TONES[tone]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-[11px] py-1 ${t.text} ${t.bg}`}>
      <span className={`w-[7px] h-[7px] rounded-full ${t.dot} ${pulse ? 'animate-pulse' : ''}`} />
      {children}
    </span>
  )
}
