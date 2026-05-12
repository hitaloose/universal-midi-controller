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
import type { ControllerConfig, PedalboardType, TapTempoBindings } from '@/lib/types'
import { useTapTempo } from '@/hooks/useTapTempo'
import { useBluetoothMidi } from '@/hooks/useBluetoothMidi'

type PadRef =
  | { kind: 'preset'; id: string }
  | { kind: 'fx'; id: string }

export default function ControllerPage() {
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
  const bt = useBluetoothMidi()
  const tapTempo = useTapTempo()

  const send = (msg: Parameters<typeof sendMessage>[0]) =>
    bt.device ? bt.sendMessage(msg) : sendMessage(msg)

  const sendRawData = (bytes: number[]) =>
    bt.device ? bt.sendRaw(bytes) : sendRaw(bytes)
  const [configuringPad, setConfiguringPad] = useState<PadRef | null>(null)
  const [isTapConfigOpen, setIsTapConfigOpen] = useState(false)
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
        if (fx) send(fx.midiOn)
      })
      toDeactivate.forEach((fxId) => {
        const fx = config.fxPads.find((f) => f.id === fxId)
        if (fx) send(fx.midiOff)
      })
    } else if (activePresetId === id) {
      const toActivate = enterSoloMode(id)
      toActivate.forEach((fxId) => {
        const fx = config.fxPads.find((f) => f.id === fxId)
        if (fx) send(fx.midiOn)
      })
    } else {
      const preset = config.presets.find((p) => p.id === id)
      if (preset) send(preset.midi)
      activatePreset(id)
      if (tapTempo.isEnabled && tapTempo.closestMs !== null) {
        const bytes = POCKET_MASTER_DELAY_TABLE[tapTempo.closestMs]
        if (bytes) sendRawData(bytes)
      }
    }
  }

  const handleToggleFx = (id: string) => {
    const fx = config.fxPads.find((f) => f.id === id)
    if (fx) {
      const isCurrentlyOn = fxStates[id] ?? false
      send(isCurrentlyOn ? fx.midiOff : fx.midiOn)
    }
    toggleFx(id)
  }

  const handleUpdateTapTempoBindings = (bindings: TapTempoBindings) => {
    updateConfig({ ...config, tapTempoBindings: bindings })
  }

  const isPocketMaster = config.pedalboardType === 'pocketMaster'

  const handlePedalboardTypeChange = (type: PedalboardType) => {
    updateConfig({ ...config, pedalboardType: type })
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

  const githubIcon = (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true" className="shrink-0">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )

  const actionButtons = (
    <>
      <span className="text-[10px] text-zinc-600 uppercase tracking-wider px-1 pt-1">Pedaleira</span>
      <select
        value={config.pedalboardType ?? 'outros'}
        onChange={(e) => { handlePedalboardTypeChange(e.target.value as PedalboardType); setIsMenuOpen(false) }}
        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
      >
        <option value="outros">Outros</option>
        <option value="pocketMaster">Pocket Master</option>
        <option value="valetonGp5">Valeton GP5</option>
      </select>
      <hr className="border-zinc-700 my-1" />
      {hasConfig && (
        <>
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider px-1 pt-1">Adicionar</span>
          <button
            onClick={() => { addPreset(); setIsMenuOpen(false) }}
            className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors text-left py-1"
          >
            + Preset
          </button>
          <button
            onClick={() => { addFxPad(); setIsMenuOpen(false) }}
            className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors text-left py-1"
          >
            + FX
          </button>
          <hr className="border-zinc-700 my-1" />
        </>
      )}
      <span className="text-[10px] text-zinc-600 uppercase tracking-wider px-1">Arquivos</span>
      {hasConfig && (
        <button
          onClick={() => { downloadConfig(config); setIsMenuOpen(false) }}
          className="text-xs text-zinc-400 hover:text-indigo-400 transition-colors text-left py-1"
        >
          Exportar
        </button>
      )}
      <button
        onClick={() => { importInputRef.current?.click(); setIsMenuOpen(false) }}
        className="text-xs text-zinc-400 hover:text-indigo-400 transition-colors text-left py-1"
      >
        Importar
      </button>
      {hasConfig && (
        <>
          <hr className="border-zinc-700 my-1" />
          <button
            onClick={() => { updateConfig({ presets: [], fxPads: [] }); setIsMenuOpen(false) }}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors text-left py-1"
          >
            Resetar
          </button>
        </>
      )}
      {bt.isSupported && (
        <>
          <hr className="border-zinc-700 my-1" />
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider px-1 pt-1">Bluetooth</span>
          {bt.device ? (
            <>
              <span className="text-xs text-blue-400 truncate">{bt.device.name}</span>
              <button
                onClick={() => { bt.disconnect(); setIsMenuOpen(false) }}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors text-left py-1"
              >
                Desconectar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { bt.connect(); setIsMenuOpen(false) }}
                disabled={bt.isConnecting}
                className="text-xs text-zinc-400 hover:text-blue-400 transition-colors text-left py-1 disabled:opacity-40"
              >
                {bt.isConnecting ? 'Conectando...' : 'Conectar via BT'}
              </button>
              {bt.connectError && (
                <span className="text-[10px] text-red-400 leading-tight px-1 pb-1">
                  {bt.connectError}
                </span>
              )}
            </>
          )}
        </>
      )}
      <hr className="border-zinc-700 my-1" />
      <a
        href="https://github.com/hitaloose/universal-midi-controller"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setIsMenuOpen(false)}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors text-left py-1"
      >
        {githubIcon}
        GitHub
      </a>
    </>
  )

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 sm:px-6 py-3 flex items-center gap-4 sm:gap-6 shrink-0">
          <h1 className="hidden sm:block text-sm font-bold tracking-widest uppercase text-zinc-400 shrink-0">
            MIDI Controller
          </h1>
          <select
            value={config.pedalboardType ?? 'outros'}
            onChange={(e) => handlePedalboardTypeChange(e.target.value as PedalboardType)}
            className="hidden sm:block bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-400 focus:outline-none focus:border-indigo-500 shrink-0"
          >
            <option value="outros">Outros</option>
            <option value="pocketMaster">Pocket Master</option>
            <option value="valetonGp5">Valeton GP5</option>
          </select>
          <div className="flex-1 min-w-0">
            <MidiDeviceSelector
              outputs={outputs}
              selectedOutputId={selectedOutputId}
              onSelect={setSelectedOutputId}
              error={error}
            />
          </div>

          {/* Bluetooth — desktop */}
          {bt.isSupported && (
            <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
              <div className="flex items-center gap-2">
                {bt.device ? (
                  <>
                    <span className="text-xs text-blue-400 truncate max-w-[120px]">{bt.device.name}</span>
                    <button
                      onClick={bt.disconnect}
                      className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <button
                    onClick={bt.connect}
                    disabled={bt.isConnecting}
                    className="text-xs text-zinc-500 hover:text-blue-400 transition-colors disabled:opacity-40"
                  >
                    {bt.isConnecting ? 'Conectando...' : '⬡ BT'}
                  </button>
                )}
                <div className={`w-2 h-2 rounded-full shrink-0 ${bt.device ? 'bg-blue-400' : 'bg-zinc-600'}`} />
              </div>
              {bt.connectError && (
                <span className="text-[10px] text-red-400 max-w-[200px] text-right leading-tight">
                  {bt.connectError}
                </span>
              )}
            </div>
          )}

          {/* Botões de ação — desktop */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {/* Grupo: Adicionar */}
            {hasConfig && (
              <>
                <button onClick={addPreset} className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors">
                  + Preset
                </button>
                <button onClick={addFxPad} className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors">
                  + FX
                </button>
                <span className="w-px h-4 bg-zinc-700" />
              </>
            )}

            {/* Grupo: Arquivos */}
            {hasConfig && (
              <button onClick={() => downloadConfig(config)} className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors">
                Exportar
              </button>
            )}
            <button onClick={() => importInputRef.current?.click()} className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors">
              Importar
            </button>

            {/* Grupo: Destrutivo */}
            {hasConfig && (
              <>
                <span className="w-px h-4 bg-zinc-700" />
                <button onClick={() => updateConfig({ presets: [], fxPads: [] })} className="text-xs text-zinc-600 hover:text-red-400 transition-colors">
                  Resetar
                </button>
              </>
            )}

            {/* GitHub */}
            <span className="w-px h-4 bg-zinc-700" />
            <a
              href="https://github.com/hitaloose/universal-midi-controller"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              {githubIcon}
              GitHub
            </a>
          </div>

          {/* Mobile: menu ⋮ */}
          <div className="sm:hidden flex items-center shrink-0">
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
          </div>
        </header>

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
              {isPocketMaster && (
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
              )}
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
              {isPocketMaster && (
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
              )}
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
