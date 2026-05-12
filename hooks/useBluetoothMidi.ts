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
  connectError: string | null
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
  const [connectError, setConnectError] = useState<string | null>(null)

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
    setConnectError(null)
    try {
      // optionalServices must be listed explicitly — Chrome on Android blocks
      // getPrimaryService() for services only declared in filters[].services.
      const dev = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_MIDI_SERVICE] }],
        optionalServices: [BLE_MIDI_SERVICE],
      })

      // The Pocket Master (and some other BLE MIDI devices) disconnect immediately
      // after GATT connect while renegotiating connection parameters, then come back
      // up. A fixed retry loop misses this window. Instead, we listen to
      // gattserverdisconnected and reconnect reactively — each disconnect triggers
      // the next connect() attempt after a short stabilisation delay.
      const char = await new Promise<BluetoothRemoteGATTCharacteristic>((resolve, reject) => {
        let attempts = 0
        const MAX = 6
        let settled = false

        const cleanup = () => {
          settled = true
          dev.removeEventListener('gattserverdisconnected', onDisconnect)
        }

        const tryConnect = async () => {
          if (settled) return
          attempts++
          try {
            const server = await dev.gatt!.connect()
            console.warn(`[BLE MIDI] attempt ${attempts}: connected=${server.connected}`)
            const service = await server.getPrimaryService(BLE_MIDI_SERVICE)
            const char = await service.getCharacteristic(BLE_MIDI_CHARACTERISTIC)
            cleanup()
            resolve(char)
          } catch (e) {
            console.warn(`[BLE MIDI] attempt ${attempts} failed:`, e)
            if (attempts >= MAX) {
              cleanup()
              reject(e)
            }
            // gattserverdisconnected fires after getPrimaryService rejects —
            // onDisconnect will schedule the next attempt.
          }
        }

        const onDisconnect = () => {
          if (!settled) {
            console.warn('[BLE MIDI] device disconnected mid-connect — retrying in 500ms')
            setTimeout(tryConnect, 500)
          }
        }

        dev.addEventListener('gattserverdisconnected', onDisconnect)
        tryConnect()
      })

      dev.addEventListener('gattserverdisconnected', handleDisconnected)
      setDevice(dev)
      setCharacteristic(char)
    } catch (err) {
      const isUserCancel = err instanceof DOMException && err.name === 'NotFoundError'
      if (!isUserCancel) {
        setConnectError('Falha ao conectar. Pareie o dispositivo nas configurações de Bluetooth do Android antes de tentar aqui.')
      }
      console.warn('[BLE MIDI] connect failed:', err)
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

  return { isSupported, device, isConnecting, connectError, connect, disconnect, sendMessage, sendRaw }
}
