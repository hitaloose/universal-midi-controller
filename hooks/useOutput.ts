'use client'

import { useMidi } from '@/hooks/useMidi'
import { useBluetoothMidi } from '@/hooks/useBluetoothMidi'
import { useMidiLog } from '@/hooks/useMidiLog'
import type { MidiMessage } from '@/lib/types'

export type ConnectionInfo =
  | { kind: 'bluetooth'; name: string }
  | { kind: 'usb'; name: string }
  | { kind: 'none' }

/**
 * One place that decides where MIDI goes (Bluetooth wins over USB when paired)
 * and records every message that actually leaves in the monitor log.
 */
export function useOutput() {
  const midi = useMidi()
  const bt = useBluetoothMidi()
  const log = useMidiLog()

  const selectedUsb = midi.outputs.find((o) => o.id === midi.selectedOutputId)
  const connection: ConnectionInfo = bt.device
    ? { kind: 'bluetooth', name: bt.device.name ?? 'Bluetooth device' }
    : selectedUsb
      ? { kind: 'usb', name: selectedUsb.name ?? 'MIDI device' }
      : { kind: 'none' }
  const connected = connection.kind !== 'none'

  const send = (msg: MidiMessage, source = '') => {
    if (!connected) return
    log.logMessage(msg, source)
    if (bt.device) bt.sendMessage(msg)
    else midi.sendMessage(msg)
  }

  const sendRaw = (bytes: number[], source = '') => {
    if (!connected) return
    log.logSysEx(bytes, source)
    if (bt.device) bt.sendRaw(bytes)
    else midi.sendRaw(bytes)
  }

  // USB: Web MIDI schedules the send itself. BLE has no timestamps, so we wait with a timer.
  const sendAt = (msg: MidiMessage, perfTime: number, source = '') => {
    if (!connected) return
    const delay = perfTime - performance.now()
    if (!bt.device) {
      midi.sendMessage(msg, perfTime)
      if (delay <= 1) log.logMessage(msg, source)
      else setTimeout(() => log.logMessage(msg, source), delay)
      return
    }
    const fire = () => {
      log.logMessage(msg, source)
      bt.sendMessage(msg)
    }
    if (delay <= 1) fire()
    else setTimeout(fire, delay)
  }

  return { midi, bt, log, send, sendRaw, sendAt, connection }
}

export type UseOutputReturn = ReturnType<typeof useOutput>
