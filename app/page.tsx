'use client'

import { useRef, useState } from 'react'
import { useController } from '@/hooks/useController'
import { useMidi } from '@/hooks/useMidi'
import { useKeyboardBindings } from '@/hooks/useKeyboardBindings'
import { ConfigPanel } from '@/components/ConfigPanel'
import { FxPad } from '@/components/FxPad'
import { MidiDeviceSelector } from '@/components/MidiDeviceSelector'
import { PadGrid } from '@/components/PadGrid'
import { PresetPad } from '@/components/PresetPad'
import { SetupModal } from '@/components/SetupModal'
import { TapTempoBlock } from '@/components/TapTempoBlock'
import { POCKET_MASTER_DELAY_TABLE } from '@/lib/pocketMasterDelayData'
import { downloadConfig, readConfigFromFile } from '@/lib/storage'
import type { ControllerConfig, TapTempoBindings } from '@/lib/types'
import { useTapTempo } from '@/hooks/useTapTempo'

type PadRef =
  | { kind: 'preset'; id: string }
  | { kind: 'fx'; id: string }

export default function Home() {
  const {
    config,
    activePresetId,
    soloPresetId,
    fxStates,
    activatePreset,
    toggleFx,
    updateConfig,
    enterSoloMode,
    exitSoloMode,
    addPreset,
    removePreset,
    addFxPad,
    removeFxPad,
  } = useController()
  const { outputs, selectedOutputId, setSelectedOutputId, sendMessage, sendRaw, error } = useMidi()
  const tapTempo = useTapTempo()
  const [configuringPad, setConfiguringPad] = useState<PadRef | null>(null)
  const [isTapConfigOpen, setIsTapConfigOpen] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const isAnyConfigOpen = configuringPad !== null || isTapConfigOpen

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await readConfigFromFile(file)
      updateConfig(imported)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao importar configuração')
    } finally {
      e.target.value = ''
    }
  }

  const handlePresetClick = (id: string) => {
    if (soloPresetId === id) {
      const { toActivate, toDeactivate } = exitSoloMode()
      toActivate.forEach((fxId) => {
        const fx = config.fxPads.find((f) => f.id === fxId)
        if (fx) sendMessage(fx.midiOn)
      })
      toDeactivate.forEach((fxId) => {
        const fx = config.fxPads.find((f) => f.id === fxId)
        if (fx) sendMessage(fx.midiOff)
      })
    } else if (activePresetId === id) {
      const toActivate = enterSoloMode(id)
      toActivate.forEach((fxId) => {
        const fx = config.fxPads.find((f) => f.id === fxId)
        if (fx) sendMessage(fx.midiOn)
      })
    } else {
      const preset = config.presets.find((p) => p.id === id)
      if (preset) sendMessage(preset.midi)
      activatePreset(id)
      if (tapTempo.isEnabled && tapTempo.closestMs !== null) {
        const bytes = POCKET_MASTER_DELAY_TABLE[tapTempo.closestMs]
        if (bytes) sendRaw(bytes)
      }
    }
  }

  const handleToggleFx = (id: string) => {
    const fx = config.fxPads.find((f) => f.id === id)
    if (fx) {
      const isCurrentlyOn = fxStates[id] ?? false
      sendMessage(isCurrentlyOn ? fx.midiOff : fx.midiOn)
    }
    toggleFx(id)
  }

  const handleUpdateTapTempoBindings = (bindings: TapTempoBindings) => {
    updateConfig({ ...config, tapTempoBindings: bindings })
  }

  useKeyboardBindings({
    config,
    onPresetPad: handlePresetClick,
    onFxPad: handleToggleFx,
    onTap: tapTempo.tap,
    onCycleSubdivision: tapTempo.cycleSubdivision,
    onDisable: tapTempo.disable,
    enabled: !isAnyConfigOpen,
  })

  const hasConfig = config.presets.length > 0 || config.fxPads.length > 0
  const presetColumns = Math.min(Math.max(config.presets.length, 1), 8)
  const fxColumns = Math.min(Math.max(config.fxPads.length, 1), 8)
  const mobilePresetCols = Math.min(presetColumns, 4)
  const mobileFxCols = Math.min(fxColumns, 4)

  const otherUsedKeys = new Set([
    ...config.presets.filter((p) => p.keyBinding).map((p) => p.keyBinding!),
    ...config.fxPads.filter((f) => f.keyBinding).map((f) => f.keyBinding!),
  ])

  const actionButtons = (
    <>
      {hasConfig && (
        <>
          <button
            onClick={() => { addPreset(); setIsMenuOpen(false) }}
            className="text-xs text-zinc-400 hover:text-white transition-colors text-left py-1"
          >
            + Preset
          </button>
          <button
            onClick={() => { addFxPad(); setIsMenuOpen(false) }}
            className="text-xs text-zinc-400 hover:text-white transition-colors text-left py-1"
          >
            + FX
          </button>
        </>
      )}
      {hasConfig && (
        <button
          onClick={() => { downloadConfig(config); setIsMenuOpen(false) }}
          className="text-xs text-zinc-400 hover:text-white transition-colors text-left py-1"
        >
          Exportar
        </button>
      )}
      <button
        onClick={() => { importInputRef.current?.click(); setIsMenuOpen(false) }}
        className="text-xs text-zinc-400 hover:text-white transition-colors text-left py-1"
      >
        Importar
      </button>
      {hasConfig && (
        <button
          onClick={() => { updateConfig({ presets: [], fxPads: [] }); setIsMenuOpen(false) }}
          className="text-xs text-zinc-400 hover:text-white transition-colors text-left py-1"
        >
          Resetar
        </button>
      )}
      <a
        href="https://github.com/hitaloose/universal-midi-controller"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setIsMenuOpen(false)}
        className="text-xs text-zinc-400 hover:text-white transition-colors text-left py-1"
      >
        GitHub
      </a>
    </>
  )

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Barra de restauração do header (mobile, quando oculto) */}
      {!isHeaderVisible && (
        <div className="sm:hidden h-9 bg-zinc-900 border-b border-zinc-800 flex items-center justify-center shrink-0">
          <button
            onClick={() => setIsHeaderVisible(true)}
            className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1 transition-colors"
          >
            <span>▼</span>
            <span>mostrar header</span>
          </button>
        </div>
      )}

      {/* Header */}
      {isHeaderVisible && (
        <header className="border-b border-zinc-800 px-4 sm:px-6 py-3 flex items-center gap-4 sm:gap-6 shrink-0">
          <h1 className="hidden sm:block text-sm font-bold tracking-widest uppercase text-zinc-400 shrink-0">
            MIDI Controller
          </h1>
          <div className="flex-1 min-w-0">
            <MidiDeviceSelector
              outputs={outputs}
              selectedOutputId={selectedOutputId}
              onSelect={setSelectedOutputId}
              error={error}
            />
          </div>

          {/* Botões de ação — desktop */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {hasConfig && (
              <>
                <button onClick={addPreset} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                  + Preset
                </button>
                <button onClick={addFxPad} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                  + FX
                </button>
              </>
            )}
            {hasConfig && (
              <button onClick={() => downloadConfig(config)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                Exportar
              </button>
            )}
            <button onClick={() => importInputRef.current?.click()} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              Importar
            </button>
            <a
              href="https://github.com/hitaloose/universal-midi-controller"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              GitHub
            </a>
            {hasConfig && (
              <button onClick={() => updateConfig({ presets: [], fxPads: [] })} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                Resetar
              </button>
            )}
          </div>

          {/* Mobile: menu ⋮ + ocultar header */}
          <div className="sm:hidden flex items-center gap-2 shrink-0">
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen((v) => !v)}
                className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors rounded"
                aria-label="Menu"
              >
                ⋮
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                  <div className="fixed top-14 right-4 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 flex flex-col p-2 min-w-[120px]">
                    {actionButtons}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setIsHeaderVisible(false)}
              className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors rounded"
              aria-label="Ocultar header"
            >
              ▲
            </button>
          </div>
        </header>
      )}

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col gap-6 p-4 sm:p-6 max-w-5xl mx-auto w-full">
        {hasConfig ? (
          <>
            {/* Desktop: colunas originais (até 8) */}
            <div className="hidden sm:contents">
              {config.presets.length > 0 && (
                <PadGrid label="Presets" columns={presetColumns}>
                  {config.presets.map((preset) => (
                    <PresetPad
                      key={preset.id}
                      pad={preset}
                      isActive={activePresetId === preset.id}
                      isSolo={soloPresetId === preset.id}
                      onClick={() => handlePresetClick(preset.id)}
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
              <TapTempoBlock
                isEnabled={tapTempo.isEnabled}
                bpm={tapTempo.bpm}
                subdivision={tapTempo.subdivision}
                delayMs={tapTempo.delayMs}
                closestMs={tapTempo.closestMs}
                onTap={tapTempo.tap}
                onCycleSubdivision={tapTempo.cycleSubdivision}
                onDisable={tapTempo.disable}
                tapTempoBindings={config.tapTempoBindings ?? {}}
                onUpdateTapTempoBindings={handleUpdateTapTempoBindings}
                otherUsedKeys={otherUsedKeys}
                onConfigOpenChange={setIsTapConfigOpen}
              />
            </div>

            {/* Mobile: todas as seções visíveis, colunas limitadas a 4 */}
            <div className="sm:hidden flex flex-col gap-6">
              {config.presets.length > 0 && (
                <PadGrid label="Presets" columns={mobilePresetCols}>
                  {config.presets.map((preset) => (
                    <PresetPad
                      key={preset.id}
                      pad={preset}
                      isActive={activePresetId === preset.id}
                      isSolo={soloPresetId === preset.id}
                      onClick={() => handlePresetClick(preset.id)}
                      onConfigure={() => setConfiguringPad({ kind: 'preset', id: preset.id })}
                    />
                  ))}
                </PadGrid>
              )}
              {config.fxPads.length > 0 && (
                <PadGrid label="FX" columns={mobileFxCols}>
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
              <TapTempoBlock
                isEnabled={tapTempo.isEnabled}
                bpm={tapTempo.bpm}
                subdivision={tapTempo.subdivision}
                delayMs={tapTempo.delayMs}
                closestMs={tapTempo.closestMs}
                onTap={tapTempo.tap}
                onCycleSubdivision={tapTempo.cycleSubdivision}
                onDisable={tapTempo.disable}
                tapTempoBindings={config.tapTempoBindings ?? {}}
                onUpdateTapTempoBindings={handleUpdateTapTempoBindings}
                otherUsedKeys={otherUsedKeys}
                onConfigOpenChange={setIsTapConfigOpen}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-700 text-sm">
            Configure o controller para começar.
          </div>
        )}
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />

      {!hasConfig && <SetupModal onConfirm={updateConfig} />}

      <ConfigPanel
        padRef={configuringPad}
        config={config}
        onSave={(updated: ControllerConfig) => {
          updateConfig(updated)
          setConfiguringPad(null)
        }}
        onRemove={(id, kind) => {
          if (kind === 'preset') removePreset(id)
          else removeFxPad(id)
          setConfiguringPad(null)
        }}
        onClose={() => setConfiguringPad(null)}
      />
    </main>
  )
}
