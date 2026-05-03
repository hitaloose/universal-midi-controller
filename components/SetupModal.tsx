'use client'

import { useState } from 'react'
import type { ControllerConfig } from '@/lib/types'

type Props = {
  onConfirm: (config: ControllerConfig) => void
}

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function buildInitialConfig(nPresets: number, nFxPads: number): ControllerConfig {
  const fxPads = Array.from({ length: nFxPads }, (_, i) => ({
    id: makeId(),
    name: `FX ${i + 1}`,
    midiOn: { channel: 1, type: 'controlChange' as const, data1: i, data2: 127 },
    midiOff: { channel: 1, type: 'controlChange' as const, data1: i, data2: 0 },
  }))

  const presets = Array.from({ length: nPresets }, (_, i) => ({
    id: makeId(),
    name: `Preset ${i + 1}`,
    midi: { channel: 1, type: 'programChange' as const, data1: i, data2: 0 },
    fxInitialStates: Object.fromEntries(fxPads.map((fx) => [fx.id, false])),
  }))

  return { presets, fxPads }
}

export function SetupModal({ onConfirm }: Props) {
  const [nPresets, setNPresets] = useState(4)
  const [nFxPads, setNFxPads] = useState(6)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(buildInitialConfig(nPresets, nFxPads))
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h1 className="text-xl font-bold text-white mb-1">Configuração inicial</h1>
        <p className="text-sm text-zinc-400 mb-6">Defina quantos pads você quer ter.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Pads de Preset
            </span>
            <input
              type="number"
              min={1}
              max={16}
              value={nPresets}
              onChange={(e) => setNPresets(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white
                focus:outline-none focus:border-indigo-500 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Pads de FX
            </span>
            <input
              type="number"
              min={0}
              max={16}
              value={nFxPads}
              onChange={(e) => setNFxPads(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white
                focus:outline-none focus:border-indigo-500 text-sm"
            />
          </label>

          <button
            type="submit"
            className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold
              rounded-lg py-2.5 transition-colors"
          >
            Criar Controller
          </button>
        </form>
      </div>
    </div>
  )
}
