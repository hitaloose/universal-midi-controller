import type { MidiMessage } from './types'
import { buildMidiBytes } from './midi'

export const BLE_MIDI_SERVICE = '03b80e5a-ede8-4b33-a751-6ce34ec4c700'
export const BLE_MIDI_CHARACTERISTIC = '7772e5db-3868-4112-a1a9-f2669d106bf3'

export function buildBleMidiPacket(midiBytes: number[]): Uint8Array<ArrayBuffer> {
  // BLE MIDI 1.0: [header 0x80][timestamp 0x80][...midiBytes]
  const buf = new ArrayBuffer(2 + midiBytes.length)
  const view = new Uint8Array(buf)
  view[0] = 0x80
  view[1] = 0x80
  midiBytes.forEach((b, i) => { view[2 + i] = b })
  return view
}

export function writeBleMidi(
  char: BluetoothRemoteGATTCharacteristic,
  msg: MidiMessage,
): Promise<void> {
  const packet = buildBleMidiPacket(Array.from(buildMidiBytes(msg)))
  console.log(
    `[BLE MIDI OUT] ${msg.type} ch${msg.channel} data1=${msg.data1} data2=${msg.data2} | packet=[${Array.from(packet).map((b) => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ')}]`,
  )
  return char.writeValueWithoutResponse(packet)
}

export function writeBleMidiRaw(
  char: BluetoothRemoteGATTCharacteristic,
  bytes: number[],
): Promise<void> {
  const packet = buildBleMidiPacket(bytes)
  console.log(
    `[BLE SYSEX OUT] packet=[${Array.from(packet).map((b) => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ')}]`,
  )
  return char.writeValueWithoutResponse(packet)
}
