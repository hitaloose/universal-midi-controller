'use client'

import { useState } from 'react'
import { useController } from '@/hooks/useController'
import { useMidi } from '@/hooks/useMidi'
import { ConfigPanel } from '@/components/ConfigPanel'
import { FxPad } from '@/components/FxPad'
import { MidiDeviceSelector } from '@/components/MidiDeviceSelector'
import { PadGrid } from '@/components/PadGrid'
import { PresetPad } from '@/components/PresetPad'
import { SetupModal } from '@/components/SetupModal'
import type { ControllerConfig } from '@/lib/types'

type PadRef =
  | { kind: 'preset'; id: string }
  | { kind: 'fx'; id: string }

export default function Home() {
  const { config, activePresetId, fxStates, activatePreset, toggleFx, updateConfig } =
    useController()
  const { outputs, selectedOutputId, setSelectedOutputId, sendMessage, error } = useMidi()
  const [configuringPad, setConfiguringPad] = useState<PadRef | null>(null)

  const hasConfig = config.presets.length > 0 || config.fxPads.length > 0

  const handleActivatePreset = (id: string) => {
    const preset = config.presets.find((p) => p.id === id)
    if (preset) sendMessage(preset.midi)
    activatePreset(id)
  }

  const handleToggleFx = (id: string) => {
    const fx = config.fxPads.find((f) => f.id === id)
    if (fx) {
      const isCurrentlyOn = fxStates[id] ?? false
      sendMessage(isCurrentlyOn ? fx.midiOff : fx.midiOn)
    }
    toggleFx(id)
  }

  const presetColumns = Math.min(Math.max(config.presets.length, 1), 8)
  const fxColumns = Math.min(Math.max(config.fxPads.length, 1), 8)

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-6">
        <h1 className="text-sm font-bold tracking-widest uppercase text-zinc-400 shrink-0">
          MIDI Controller
        </h1>
        <div className="flex-1">
          <MidiDeviceSelector
            outputs={outputs}
            selectedOutputId={selectedOutputId}
            onSelect={setSelectedOutputId}
            error={error}
          />
        </div>
        {hasConfig && (
          <button
            onClick={() => updateConfig({ presets: [], fxPads: [] })}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
          >
            Resetar
          </button>
        )}
      </header>

      <div className="flex-1 flex flex-col gap-8 p-6 max-w-5xl mx-auto w-full">
        {hasConfig ? (
          <>
            {config.presets.length > 0 && (
              <PadGrid label="Presets" columns={presetColumns}>
                {config.presets.map((preset) => (
                  <PresetPad
                    key={preset.id}
                    pad={preset}
                    isActive={activePresetId === preset.id}
                    onClick={() => handleActivatePreset(preset.id)}
                    onConfigure={() => setConfiguringPad({ kind: 'preset', id: preset.id })}
                  />
                ))}
              </PadGrid>
            )}

            {config.fxPads.length > 0 && (
              <PadGrid label="FX" columns={fxColumns}>
                {config.fxPads.map((fx) => (
                  <FxPad
                    key={fx.id}
                    pad={fx}
                    isOn={fxStates[fx.id] ?? false}
                    onClick={() => handleToggleFx(fx.id)}
                    onConfigure={() => setConfiguringPad({ kind: 'fx', id: fx.id })}
                  />
                ))}
              </PadGrid>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-700 text-sm">
            Configure o controller para começar.
          </div>
        )}
      </div>

      {!hasConfig && <SetupModal onConfirm={updateConfig} />}

      <ConfigPanel
        padRef={configuringPad}
        config={config}
        onSave={(updated: ControllerConfig) => {
          updateConfig(updated)
          setConfiguringPad(null)
        }}
        onClose={() => setConfiguringPad(null)}
      />
    </main>
  )
}
