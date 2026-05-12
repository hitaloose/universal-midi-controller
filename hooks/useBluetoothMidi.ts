'use client'

import { useCallback, useEffect, useState } from 'react'
import type { MidiMessage } from '@/lib/types'
import {
  BLE_MIDI_SERVICE,
  BLE_MIDI_CHARACTERISTIC,
  writeBleMidi,
  writeBleMidiRaw,
} from '@/lib/bluetoothMidi'

type UseBluetoothMidiReturn = {
  isSupported: boolean
  device: BluetoothDevice | null
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  sendMessage: (msg: MidiMessage) => void
  sendRaw: (bytes: number[]) => void
}

export function useBluetoothMidi(): UseBluetoothMidiReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [device, setDevice] = useState<BluetoothDevice | null>(null)
  const [characteristic, setCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && 'bluetooth' in navigator)
  }, [])

  const handleDisconnected = useCallback(() => {
    setDevice(null)
    setCharacteristic(null)
  }, [])

  const connect = useCallback(async () => {
    if (!isSupported) return
    setIsConnecting(true)
    try {
      const dev = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_MIDI_SERVICE] }],
      })
      dev.addEventListener('gattserverdisconnected', handleDisconnected)
      const server = await dev.gatt!.connect()
      const service = await server.getPrimaryService(BLE_MIDI_SERVICE)
      const char = await service.getCharacteristic(BLE_MIDI_CHARACTERISTIC)
      setDevice(dev)
      setCharacteristic(char)
    } catch (err) {
      // User cancelled or connection failed — no-op
      console.warn('[BLE MIDI] connect cancelled or failed:', err)
    } finally {
      setIsConnecting(false)
    }
  }, [isSupported, handleDisconnected])

  const disconnect = useCallback(() => {
    device?.gatt?.disconnect()
    // handleDisconnected fires via gattserverdisconnected event
  }, [device])

  const sendMessage = useCallback(
    (msg: MidiMessage) => {
      if (!characteristic) return
      writeBleMidi(characteristic, msg).catch((err) =>
        console.warn('[BLE MIDI] sendMessage error:', err),
      )
    },
    [characteristic],
  )

  const sendRaw = useCallback(
    (bytes: number[]) => {
      if (!characteristic) return
      writeBleMidiRaw(characteristic, bytes).catch((err) =>
        console.warn('[BLE MIDI] sendRaw error:', err),
      )
    },
    [characteristic],
  )

  return { isSupported, device, isConnecting, connect, disconnect, sendMessage, sendRaw }
}
