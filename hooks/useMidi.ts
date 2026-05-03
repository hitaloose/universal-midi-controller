'use client'

import { useCallback, useEffect, useState } from 'react'
import type { MidiMessage } from '@/lib/types'
import { sendMidi } from '@/lib/midi'

type UseMidiReturn = {
  outputs: MIDIOutput[]
  selectedOutputId: string | null
  setSelectedOutputId: (id: string | null) => void
  sendMessage: (msg: MidiMessage) => void
  error: string | null
}

export function useMidi(): UseMidiReturn {
  const [outputs, setOutputs] = useState<MIDIOutput[]>([])
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [access, setAccess] = useState<MIDIAccess | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
      setError('Web MIDI API não suportada neste navegador.')
      return
    }

    navigator.requestMIDIAccess().then(
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
    (msg: MidiMessage) => {
      if (!access || !selectedOutputId) return
      const output = access.outputs.get(selectedOutputId)
      if (output) sendMidi(output, msg)
    },
    [access, selectedOutputId],
  )

  return { outputs, selectedOutputId, setSelectedOutputId, sendMessage, error }
}
