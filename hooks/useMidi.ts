'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MidiMessage } from '@/lib/types'
import { sendMidi, sendSysEx } from '@/lib/midi'
import { loadLastMidiOutputId, saveLastMidiOutputId } from '@/lib/storage'

type UseMidiReturn = {
  outputs: MIDIOutput[]
  selectedOutputId: string | null
  setSelectedOutputId: (id: string | null) => void
  /** `timestamp` is in performance.now() time; the browser schedules the send. */
  sendMessage: (msg: MidiMessage, timestamp?: number) => void
  sendRaw: (bytes: number[]) => void
  error: string | null
}

export function useMidi(): UseMidiReturn {
  const [outputs, setOutputs] = useState<MIDIOutput[]>([])
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [access, setAccess] = useState<MIDIAccess | null>(null)
  const lastSavedId = useRef<string | null>(loadLastMidiOutputId())

  useEffect(() => {
    if (!selectedOutputId) return
    saveLastMidiOutputId(selectedOutputId)
    lastSavedId.current = selectedOutputId
  }, [selectedOutputId])

  useEffect(() => {
    const saved = lastSavedId.current
    if (!saved || selectedOutputId) return
    const match = outputs.find((o) => o.id === saved)
    if (match) setSelectedOutputId(match.id)
  }, [outputs, selectedOutputId])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
      setError('Web MIDI API não suportada neste navegador.')
      return
    }

    navigator.requestMIDIAccess({ sysex: true }).then(
      (midiAccess) => {
        setAccess(midiAccess)
        const refreshOutputs = () => {
          setOutputs(Array.from(midiAccess.outputs.values()))
        }
        refreshOutputs()
        midiAccess.onstatechange = refreshOutputs
      },
      () => {
        setError('Permissão de acesso MIDI negada.')
      },
    )
  }, [])

  const sendMessage = useCallback(
    (msg: MidiMessage, timestamp?: number) => {
      if (!access || !selectedOutputId) return
      const output = access.outputs.get(selectedOutputId)
      if (output) sendMidi(output, msg, timestamp)
    },
    [access, selectedOutputId],
  )

  const sendRaw = useCallback(
    (bytes: number[]) => {
      if (!access || !selectedOutputId) return
      const output = access.outputs.get(selectedOutputId)
      if (output) sendSysEx(output, bytes)
    },
    [access, selectedOutputId],
  )

  return { outputs, selectedOutputId, setSelectedOutputId, sendMessage, sendRaw, error }
}
