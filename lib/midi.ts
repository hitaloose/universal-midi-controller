import type { MidiMessage } from './types'

const STATUS_BYTES: Record<string, number> = {
  noteOff: 0x80,
  noteOn: 0x90,
  controlChange: 0xb0,
  programChange: 0xc0,
}

export function buildMidiBytes(msg: MidiMessage): [number, number, number] {
  const status = (STATUS_BYTES[msg.type] ?? 0x90) | ((msg.channel - 1) & 0x0f)
  return [status, msg.data1 & 0x7f, msg.data2 & 0x7f]
}

export function sendMidi(output: MIDIOutput, msg: MidiMessage): void {
  const bytes = buildMidiBytes(msg)
  console.log(
    `[MIDI OUT] ${output.name} | ${msg.type} ch${msg.channel} data1=${msg.data1} data2=${msg.data2} | bytes=[${bytes.map((b) => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ')}]`,
  )
  output.send(bytes)
}
