'use client'

import type { FxPad as FxPadType } from '@/lib/types'
import { KeyCap } from '@/components/ui/KeyCap'

type Props = {
  pad: FxPadType
  isOn: boolean
  onClick: () => void
  displayName?: string
}

export function FxPad({ pad, isOn, onClick, displayName }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isOn}
      className={`box-border flex flex-col justify-between items-start text-left min-h-[76px] sm:min-h-[104px] px-3.5 py-3 rounded-[14px] border cursor-pointer select-none transition-colors ${
        isOn ? 'bg-fx-deep border-fx-line text-fx-ink' : 'bg-surface border-line-soft text-ink hover:bg-surface-2'
      }`}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <KeyCap code={pad.keyBinding} tone={isOn ? 'onMint' : 'idle'} />
        <span
          aria-hidden="true"
          className={`ml-auto w-2.5 h-2.5 rounded-full ${isOn ? 'bg-fx shadow-[0_0_10px_2px_rgba(61,220,151,0.55)]' : 'bg-line'}`}
        />
      </span>
      <span className="flex w-full items-end justify-between gap-2">
        <span className="text-base sm:text-[17px] font-bold leading-tight break-words">{displayName || pad.name}</span>
        <span className={`font-mono text-xs font-bold tracking-[0.1em] ${isOn ? 'text-fx' : 'text-ink-mute'}`}>
          {isOn ? 'ON' : 'OFF'}
        </span>
      </span>
    </button>
  )
}
