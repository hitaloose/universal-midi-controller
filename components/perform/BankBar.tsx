import { BANK_IDS, type BankId } from '@/lib/types'

type Props = {
  activeBank: BankId
  counts: Record<BankId, number>
  onChange: (bank: BankId) => void
  /** Edit mode shows empty banks at full strength so they can be filled. */
  tone?: 'perform' | 'edit'
}

export function BankBar({ activeBank, counts, onChange, tone = 'perform' }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold tracking-[0.12em] uppercase text-ink-dim">Bank</span>
      <div role="group" aria-label="Bank" className="flex gap-1.5">
        {BANK_IDS.map((b) => {
          const on = b === activeBank
          const empty = counts[b] === 0
          return (
            <button
              key={b}
              type="button"
              aria-pressed={on}
              aria-label={`Bank ${b}, ${counts[b]} presets`}
              onClick={() => onChange(b)}
              className={`relative w-11 h-11 rounded-control font-mono text-[15px] font-bold cursor-pointer border transition-colors ${
                on
                  ? tone === 'edit'
                    ? 'bg-edit/15 border-edit text-edit'
                    : 'bg-preset/15 border-preset text-preset'
                  : `bg-surface border-line text-ink hover:bg-surface-2 ${empty && tone === 'perform' ? 'opacity-45' : ''}`
              }`}
            >
              {b}
              {counts[b] > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-surface-2 border border-line text-[10px] leading-[16px] text-ink-dim">
                  {counts[b]}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
