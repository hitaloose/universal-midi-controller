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
  output.send(buildMidiBytes(msg))
}
