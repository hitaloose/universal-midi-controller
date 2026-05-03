'use client'

type Props = {
  outputs: MIDIOutput[]
  selectedOutputId: string | null
  onSelect: (id: string | null) => void
  error: string | null
}

export function MidiDeviceSelector({ outputs, selectedOutputId, onSelect, error }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 shrink-0">
        Saída MIDI
      </span>
      {error ? (
        <span className="text-xs text-red-400">{error}</span>
      ) : (
        <select
          value={selectedOutputId ?? ''}
          onChange={(e) => onSelect(e.target.value || null)}
          className="flex-1 max-w-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5
            text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="">— Nenhum dispositivo —</option>
          {outputs.map((out) => (
            <option key={out.id} value={out.id}>
              {out.name}
            </option>
          ))}
        </select>
      )}
      <div className={`w-2 h-2 rounded-full shrink-0 ${selectedOutputId ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
    </div>
  )
}
