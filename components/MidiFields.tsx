import type { MidiMessage, MidiMessageType } from '@/lib/types'

export const MIDI_TYPES: { value: MidiMessageType; label: string }[] = [
  { value: 'programChange', label: 'Program Change' },
  { value: 'controlChange', label: 'Control Change' },
  { value: 'noteOn', label: 'Note On' },
  { value: 'noteOff', label: 'Note Off' },
]

const field =
  'box-border h-10 rounded-lg border border-line bg-ground text-ink px-2.5 text-sm font-semibold min-w-0 w-full focus:outline-2 focus:outline-preset'

export const clampNum = (min: number, max: number, v: string) => Math.min(max, Math.max(min, Number(v) || 0))

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
    <fieldset className="flex flex-col gap-2 border border-line-soft rounded-xl p-3 m-0">
      <legend className="text-xs font-semibold tracking-[0.1em] uppercase text-ink-dim px-1">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-dim">Channel</span>
          <input
            type="number"
            min={1}
            max={16}
            value={value.channel}
            onChange={(e) => onChange({ ...value, channel: clampNum(1, 16, e.target.value) })}
            className={`${field} font-mono`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-dim">Type</span>
          <select
            value={value.type}
            onChange={(e) => onChange({ ...value, type: e.target.value as MidiMessageType })}
            className={field}
          >
            {MIDI_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-dim">Data 1</span>
          <input
            type="number"
            min={0}
            max={127}
            value={value.data1}
            onChange={(e) => onChange({ ...value, data1: clampNum(0, 127, e.target.value) })}
            className={`${field} font-mono`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-dim">Data 2</span>
          <input
            type="number"
            min={0}
            max={127}
            value={value.data2}
            onChange={(e) => onChange({ ...value, data2: clampNum(0, 127, e.target.value) })}
            className={`${field} font-mono`}
          />
        </label>
      </div>
    </fieldset>
  )
}
