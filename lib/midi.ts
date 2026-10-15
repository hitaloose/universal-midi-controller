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

export function sendMidi(output: MIDIOutput, msg: MidiMessage, timestamp?: number): void {
  const bytes = buildMidiBytes(msg)
  console.log(
    `[MIDI OUT] ${output.name} | ${msg.type} ch${msg.channel} data1=${msg.data1} data2=${msg.data2} | bytes=[${bytes.map((b) => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ')}]${timestamp !== undefined ? ` | at=${timestamp.toFixed(1)} (in ${(timestamp - performance.now()).toFixed(1)}ms)` : ''}`,
  )
  output.send(bytes, timestamp)
}

export function sendSysEx(output: MIDIOutput, bytes: number[]): void {
  console.log(
    `[SYSEX OUT] ${output.name} | bytes=[${bytes.map((b) => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ')}]`,
  )
  output.send(bytes)
}

const ALL_NOTES_OFF = 123
const ALL_SOUND_OFF = 120

/** All Notes Off + All Sound Off on every channel. */
export function buildPanicMessages(): MidiMessage[] {
  return Array.from({ length: 16 }, (_, i) => i + 1).flatMap((channel) => [
    { channel, type: 'controlChange' as const, data1: ALL_NOTES_OFF, data2: 0 },
    { channel, type: 'controlChange' as const, data1: ALL_SOUND_OFF, data2: 0 },
  ])
}
