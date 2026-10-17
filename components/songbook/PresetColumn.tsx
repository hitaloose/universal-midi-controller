'use client'

import { BANK_IDS, type BankId, type PresetPad } from '@/lib/types'
import { bankOf } from '@/hooks/useController'
import { padColor } from '@/lib/padColors'
import { KeyCap } from '@/components/ui/KeyCap'

export type PresetControl = {
  activeBank: BankId
  onBankChange: (bank: BankId) => void
  activePresetId: string | null
  soloPresetId: string | null
  /** Same handler as the Perform pads, so pressing the active preset again toggles solo. */
  onPreset: (id: string) => void
}

const SOLO_STYLE = { background: '#B79CFF', borderColor: '#D2BFFF', color: '#140A33' }

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Compact, touch-sized preset list for the reader: the active bank only, no FX pads. */
export function PresetColumn({ presets, control }: { presets: PresetPad[]; control: PresetControl }) {
  const { activeBank, activePresetId, soloPresetId } = control
  const inBank = presets.filter((p) => bankOf(p) === activeBank)

  return (
    <div className="flex flex-col h-full min-h-0">
      <div role="group" aria-label="Bank" className="shrink-0 grid grid-cols-4 gap-1 p-2 border-b border-line-soft">
        {BANK_IDS.map((b) => {
          const on = b === activeBank
          const empty = !presets.some((p) => bankOf(p) === b)
          return (
            <button
              key={b}
              type="button"
              aria-pressed={on}
              aria-label={`Bank ${b}`}
              onClick={() => control.onBankChange(b)}
              className={`h-9 rounded-control font-mono text-[13px] font-bold cursor-pointer border transition-colors ${
                on ? 'bg-preset/15 border-preset text-preset' : `bg-surface border-line text-ink hover:bg-surface-2 ${empty ? 'opacity-45' : ''}`
              }`}
            >
              {b}
            </button>
          )
        })}
      </div>

      <ul aria-label="Presets" className="flex-1 min-h-0 overflow-y-auto m-0 p-2 list-none flex flex-col gap-1.5">
        {inBank.map((p, i) => {
          const isSolo = soloPresetId === p.id
          const isActive = activePresetId === p.id && !isSolo
          const color = padColor(p.color)
          const style = isSolo ? SOLO_STYLE : isActive ? { background: color.hex, borderColor: color.hi, color: color.ink } : undefined
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={isActive || isSolo}
                onClick={() => control.onPreset(p.id)}
                style={style}
                className={`relative w-full min-h-12 flex items-center gap-2 pl-3 pr-2 rounded-control border text-left cursor-pointer select-none transition-colors ${
                  style ? '' : 'bg-surface border-line-soft text-ink hover:bg-surface-2'
                }`}
              >
                {!style && p.color && (
                  <span className="absolute left-0 inset-y-2 w-1 rounded-r-sm" style={{ background: color.hex }} aria-hidden="true" />
                )}
                <span className={`font-mono text-[11px] font-bold ${style ? 'opacity-70' : 'text-ink-dim'}`}>{pad2(i + 1)}</span>
                <span className="flex-1 min-w-0 flex flex-col leading-tight">
                  <span className="text-[15px] font-bold truncate">{p.name}</span>
                  {isSolo && <span className="font-mono text-[10px] font-bold tracking-[0.06em] opacity-70">SOLO</span>}
                </span>
                <KeyCap code={p.keyBinding} tone={isSolo ? 'onViolet' : isActive ? 'onAmber' : 'idle'} />
              </button>
            </li>
          )
        })}
        {inBank.length === 0 && <li className="text-xs text-ink-dim px-1">Bank {activeBank} has no presets.</li>}
      </ul>

      <p className="shrink-0 m-0 px-3 py-2 text-[11px] text-ink-dim border-t border-line-soft">Tap the active preset again for solo.</p>
    </div>
  )
}
