'use client'

import type { PresetPad as PresetPadType } from '@/lib/types'
import { padColor } from '@/lib/padColors'
import { KeyCap } from '@/components/ui/KeyCap'

type Props = {
  pad: PresetPadType
  index: number
  tag: string
  isActive: boolean
  isSolo: boolean
  /** One flag per FX pad, in FX order: what this preset turns on. */
  fxDots: boolean[]
  onClick: () => void
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export function PresetPad({ pad, index, tag, isActive, isSolo, fxDots, onClick }: Props) {
  const on = isActive || isSolo
  const color = padColor(pad.color)
  const style = isSolo
    ? { background: '#B79CFF', borderColor: '#D2BFFF', color: '#140A33' }
    : isActive
      ? { background: color.hex, borderColor: color.hi, color: color.ink }
      : undefined
  const sub = on ? 'opacity-70' : 'text-ink-dim'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={style}
      className={`box-border flex flex-col justify-between items-start text-left min-h-[104px] sm:min-h-[140px] px-4 py-3.5 rounded-pad border cursor-pointer select-none transition-colors ${
        on ? '' : 'bg-surface border-line-soft text-ink hover:bg-surface-2'
      }`}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className={`font-mono text-xs font-bold ${sub}`}>{pad2(index + 1)}</span>
        <KeyCap code={pad.keyBinding} tone={isSolo ? 'onViolet' : isActive ? 'onAmber' : 'idle'} />
      </span>
      {!on && pad.color && (
        <span className="w-[22px] h-1 rounded-sm" style={{ background: color.hex }} aria-hidden="true" />
      )}
      <span className="flex flex-col gap-2 w-full">
        <span className="text-lg sm:text-xl font-bold leading-tight break-words">{pad.name}</span>
        <span className="flex flex-col items-start gap-1.5 w-full">
          <span className="flex gap-1.5 flex-wrap" aria-hidden="true">
            {fxDots.map((v, i) => (
              <span
                key={i}
                className="w-[9px] h-[9px] rounded-full"
                style={{
                  background: v ? (on ? 'currentColor' : '#3DDC97') : on ? 'rgba(0,0,0,0.22)' : '#2A2E34',
                }}
              />
            ))}
          </span>
          <span className={`font-mono text-[11px] font-bold tracking-[0.06em] ${sub}`}>
            {isSolo ? 'SOLO' : isActive ? 'ACTIVE' : tag}
          </span>
        </span>
      </span>
    </button>
  )
}
