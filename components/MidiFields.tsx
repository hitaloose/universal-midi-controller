import type { MidiMessage, MidiMessageType } from '@/lib/types'

const MIDI_TYPES: { value: MidiMessageType; label: string }[] = [
  { value: 'programChange', label: 'Program Change' },
  { value: 'controlChange', label: 'Control Change' },
  { value: 'noteOn', label: 'Note On' },
  { value: 'noteOff', label: 'Note Off' },
]

export function MidiFields({
  label,
  value,
  onChange,
}: {
  label: string
  value: MidiMessage
  onChange: (msg: MidiMessage) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2 border border-zinc-700 rounded-lg p-3">
      <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-1">
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Channel</span>
          <input
            type="number"
            min={1}
            max={16}
            value={value.channel}
            onChange={(e) => onChange({ ...value, channel: Number(e.target.value) })}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Type</span>
          <select
            value={value.type}
            onChange={(e) => onChange({ ...value, type: e.target.value as MidiMessageType })}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {MIDI_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Data 1</span>
          <input
            type="number"
            min={0}
            max={127}
            value={value.data1}
            onChange={(e) => onChange({ ...value, data1: Number(e.target.value) })}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Data 2</span>
          <input
            type="number"
            min={0}
            max={127}
            value={value.data2}
            onChange={(e) => onChange({ ...value, data2: Number(e.target.value) })}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </label>
      </div>
    </fieldset>
  )
}
