'use client'

type Props = {
  outputs: MIDIOutput[]
  selectedOutputId: string | null
  onSelect: (id: string | null) => void
  error: string | null
}

/** USB / virtual MIDI outputs as a radio list. */
export function DeviceList({ outputs, selectedOutputId, onSelect, error }: Props) {
  if (error) return <p className="m-0 text-[13px] text-panic">{error}</p>
  if (outputs.length === 0)
    return <p className="m-0 text-[13px] text-ink-dim">No MIDI outputs found. Plug the pedal in and power it on; the list updates by itself.</p>

  return (
    <div role="radiogroup" aria-label="MIDI output" className="flex flex-col gap-2">
      {outputs.map((o) => {
        const on = o.id === selectedOutputId
        return (
          <label
            key={o.id}
            className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl cursor-pointer border ${
              on ? 'border-2 border-preset bg-preset/7' : 'border-line bg-surface'
            }`}
          >
            <input
              type="radio"
              name="midi-output"
              checked={on}
              onChange={() => onSelect(o.id)}
              className="w-5 h-5 accent-preset"
            />
            <span className="flex flex-col flex-1 min-w-0">
              <span className="text-[15px] font-bold truncate">{o.name}</span>
              <span className="text-xs text-ink-dim truncate">{o.manufacturer || 'MIDI output'}</span>
            </span>
            {on && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-fx">
                <span className="w-[7px] h-[7px] rounded-full bg-fx" />
                Ready
              </span>
            )}
          </label>
        )
      })}
      {selectedOutputId && (
        <button type="button" onClick={() => onSelect(null)} className="self-start text-[13px] text-ink-dim hover:text-ink cursor-pointer py-1">
          Use no USB device
        </button>
      )}
    </div>
  )
}
