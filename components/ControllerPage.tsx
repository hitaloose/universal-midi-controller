'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useController } from '@/hooks/useController'
import { useKeyboardBindings } from '@/hooks/useKeyboardBindings'
import { useTapTempo } from '@/hooks/useTapTempo'
import { useLooper } from '@/hooks/useLooper'
import { useOutput } from '@/hooks/useOutput'
import { useAppView } from '@/hooks/useAppView'
import { POCKET_MASTER_DELAY_TABLE } from '@/lib/pocketMasterDelayData'
import { downloadConfig, readConfigFromFile } from '@/lib/storage'
import { resolveLooperConfig } from '@/lib/looper'
import { buildPanicMessages } from '@/lib/midi'
import { profileOf } from '@/lib/profiles'
import { padKeys } from '@/lib/keys'
import type { ControllerConfig, FxPad, LooperCommands, LooperConfig, MidiMessage, PresetPad, TapTempoBindings } from '@/lib/types'
import { COMMAND_LABELS } from '@/components/looper/shared'
import { TopBar } from '@/components/shell/TopBar'
import { BottomTabs, NavRail } from '@/components/shell/Nav'
import { StatusBar } from '@/components/shell/StatusBar'
import { PerformView } from '@/components/views/PerformView'
import { EditView } from '@/components/views/EditView'
import { LooperView } from '@/components/views/LooperView'
import { MonitorView } from '@/components/views/MonitorView'
import { SettingsView } from '@/components/views/SettingsView'
import { SetupWizard } from '@/components/setup/SetupWizard'

const MIDI_MSG_DELAY_MS = 60

// Pocket Master "request current preset state" (command 0201020401).
// Sending this puts the device into editor mode, after which it accepts
// standalone 0408 parameter-set SysEx without needing a preceding PC message.
const PM_REQUEST_PRESET_STATE = [0xF0, 0x00, 0x09, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0x01, 0x02, 0x04, 0x01, 0xF7]

const sameMsg = (a: MidiMessage, b: MidiMessage) =>
  a.channel === b.channel && a.type === b.type && a.data1 === b.data1 && a.data2 === b.data2

/** Monitor label for a looper message, found by matching it against the configured commands. */
function looperSource(msg: MidiMessage, commands: LooperCommands): string {
  const hit = COMMAND_LABELS.find(({ key }) => sameMsg(commands[key], msg))
  return hit ? `Looper ${hit.label.replace(/ \(.*\)$/, '').toLowerCase()}` : 'Looper'
}

export default function ControllerPage() {
  const controller = useController()
  const {
    config,
    activePresetId,
    soloPresetId,
    activeBank,
    setActiveBank,
    fxStates,
    activatePreset,
    toggleFx,
    updateConfig,
    patchConfig,
    enterSoloMode,
    exitSoloMode,
  } = controller
  const output = useOutput()
  const { send, sendRaw } = output
  const tapTempo = useTapTempo()
  const { view, setView } = useAppView()
  const importInputRef = useRef<HTMLInputElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  // From md up the page itself is fixed and <main> scrolls, so reset it on view change.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [view])

  const looperConfig = resolveLooperConfig(config.looper)
  const handleUpdateLooper = useCallback((looper: LooperConfig) => patchConfig({ looper }), [patchConfig])
  const looper = useLooper({
    config: looperConfig,
    onConfigChange: handleUpdateLooper,
    sendAt: (msg, perfTime, note) => {
      const source = looperSource(msg, looperConfig.commands)
      output.sendAt(msg, perfTime, note ? `${source} · ${note}` : source)
    },
    sendNow: (msg) => send(msg, looperSource(msg, looperConfig.commands)),
    preciseTimestamps: output.connection.kind === 'usb',
  })

  const sendTapDelay = (source: string) => {
    if (tapTempo.closestMs === null) return null
    const bytes = POCKET_MASTER_DELAY_TABLE[tapTempo.closestMs]
    // Table entries include a 2-byte BLE MIDI framing header from capture; strip it
    // so both USB (output.send) and BLE (writeBleMidiRaw) receive plain SysEx [0xF0…0xF7]
    return bytes ? () => sendRaw(bytes.slice(2), source) : null
  }

  const tapTempoSendRef = useRef<() => void>(() => {})
  useLayoutEffect(() => {
    tapTempoSendRef.current = () => {
      if (!tapTempo.isEnabled) return
      const fire = sendTapDelay(`Tap delay ${tapTempo.closestMs} ms`)
      if (!fire) return
      // Prime the device into editor mode, then send delay time 100ms later
      sendRaw(PM_REQUEST_PRESET_STATE, 'Tap delay: editor mode')
      setTimeout(fire, 100)
    }
  })

  useEffect(() => {
    if (!tapTempo.isEnabled || tapTempo.closestMs === null) return
    const timer = setTimeout(() => tapTempoSendRef.current(), 500)
    return () => clearTimeout(timer)
  }, [tapTempo.isEnabled, tapTempo.closestMs])

  const fxName = (fx: FxPad) => config.presets.find((p) => p.id === activePresetId)?.fxAliases?.[fx.id] || fx.name

  const handlePresetClick = (id: string) => {
    const sendFx = (fxId: string, on: boolean, i: number) => {
      const fx = config.fxPads.find((f) => f.id === fxId)
      if (!fx) return
      setTimeout(() => send(on ? fx.midiOn : fx.midiOff, `FX ${fxName(fx)} ${on ? 'on' : 'off'}`), i * MIDI_MSG_DELAY_MS)
    }
    if (soloPresetId === id) {
      const { toActivate, toDeactivate } = exitSoloMode()
      ;[...toActivate.map((fxId) => ({ fxId, on: true })), ...toDeactivate.map((fxId) => ({ fxId, on: false }))].forEach(
        ({ fxId, on }, i) => sendFx(fxId, on, i),
      )
    } else if (activePresetId === id) {
      enterSoloMode(id).forEach((fxId, i) => sendFx(fxId, true, i))
    } else {
      const preset = config.presets.find((p) => p.id === id)
      if (preset) send(preset.midi, `Preset ${preset.name}`)
      activatePreset(id)
      if (tapTempo.isEnabled) {
        const fire = sendTapDelay(`Tap delay ${tapTempo.closestMs} ms`)
        if (fire) setTimeout(fire, MIDI_MSG_DELAY_MS)
      }
    }
  }

  const handleToggleFx = (id: string) => {
    const fx = config.fxPads.find((f) => f.id === id)
    if (fx) {
      const isCurrentlyOn = fxStates[id] ?? false
      send(isCurrentlyOn ? fx.midiOff : fx.midiOn, `FX ${fxName(fx)} ${isCurrentlyOn ? 'off' : 'on'}`)
    }
    toggleFx(id)
  }

  const handlePanic = () => buildPanicMessages().forEach((m) => send(m, 'Panic'))

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      updateConfig(await readConfigFromFile(file))
      setActiveBank('A')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import configuration')
    } finally {
      e.target.value = ''
    }
  }

  const savePreset = (updated: PresetPad) =>
    patchConfig({ presets: config.presets.map((p) => (p.id === updated.id ? updated : p)) })
  const saveFx = (updated: FxPad) => patchConfig({ fxPads: config.fxPads.map((f) => (f.id === updated.id ? updated : f)) })
  const handleUpdateTapBindings = (tapTempoBindings: TapTempoBindings) => patchConfig({ tapTempoBindings })

  const allPadKeys = padKeys(config)
  const looperKeys = Object.values(looperConfig.bindings).filter(Boolean) as string[]
  const tapKeys = Object.values(config.tapTempoBindings ?? {}).filter(Boolean) as string[]
  const tapOtherUsedKeys = new Set([...allPadKeys, ...looperKeys])
  const looperOtherUsedKeys = new Set([...allPadKeys, ...tapKeys])

  const looperActions = useMemo(
    () => ({
      toggle: looper.toggle,
      rec: looper.record,
      playStop: looper.playStop,
      clear: looper.clear,
      click: looper.toggleClick,
      tap: looper.tap,
    }),
    [looper.toggle, looper.record, looper.playStop, looper.clear, looper.toggleClick, looper.tap],
  )

  const hasConfig = config.presets.length > 0 || config.fxPads.length > 0
  const showLooper = config.showLooper !== false

  useKeyboardBindings({
    config,
    activeBank,
    onPresetPad: handlePresetClick,
    onFxPad: handleToggleFx,
    onTap: tapTempo.tap,
    onCycleSubdivision: tapTempo.cycleSubdivision,
    onDisable: tapTempo.disable,
    looperBindings: looperConfig.bindings,
    looperActions,
    // Editing and settings use the keyboard for typing and key capture.
    enabled: hasConfig && (view === 'perform' || view === 'looper' || view === 'monitor'),
  })

  const importInput = (
    <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
  )

  if (!hasConfig) {
    return (
      <>
        <SetupWizard
          output={output}
          onCreate={(c: ControllerConfig) => {
            updateConfig(c)
            setActiveBank('A')
            setView('perform')
          }}
          onImport={() => importInputRef.current?.click()}
        />
        {importInput}
      </>
    )
  }

  return (
    <div className="min-h-dvh md:h-dvh md:overflow-hidden bg-ground text-ink flex flex-col">
      <TopBar
        setupName={profileOf(config).label}
        connection={output.connection}
        onConnectionClick={() => setView('settings')}
        onPanic={handlePanic}
      />
      <div className="flex-1 flex items-stretch md:min-h-0">
        <NavRail view={view} onChange={setView} hideLooper={!showLooper} />
        <main ref={mainRef} className="flex-1 min-w-0 pb-20 md:pb-0 md:overflow-y-auto">
          {view === 'perform' && (
            <PerformView
              config={config}
              activeBank={activeBank}
              onBankChange={setActiveBank}
              activePresetId={activePresetId}
              soloPresetId={soloPresetId}
              fxStates={fxStates}
              onPreset={handlePresetClick}
              onFx={handleToggleFx}
              tapTempo={tapTempo}
              onUpdateTapBindings={handleUpdateTapBindings}
              tapOtherUsedKeys={tapOtherUsedKeys}
              looper={looper}
              looperConfig={looperConfig}
              onOpenLooper={() => setView('looper')}
              onOpenEdit={() => setView('edit')}
            />
          )}
          {view === 'edit' && (
            <EditView
              config={config}
              activeBank={activeBank}
              onBankChange={setActiveBank}
              addPreset={controller.addPreset}
              addFxPad={controller.addFxPad}
              duplicatePreset={controller.duplicatePreset}
              removePreset={controller.removePreset}
              removeFxPad={controller.removeFxPad}
              movePreset={controller.movePreset}
              moveFxPad={controller.moveFxPad}
              savePreset={savePreset}
              saveFx={saveFx}
              onSendTest={send}
              onImport={() => importInputRef.current?.click()}
              onExport={() => downloadConfig(config)}
              onDone={() => setView('perform')}
            />
          )}
          {view === 'looper' && (
            <LooperView
              looper={looper}
              config={looperConfig}
              onChange={handleUpdateLooper}
              sendNow={send}
              otherUsedKeys={looperOtherUsedKeys}
              isBluetooth={!!output.bt.device}
              isAndroidUsb={output.connection.kind === 'usb' && /Android/i.test(navigator.userAgent)}
            />
          )}
          {view === 'monitor' && <MonitorView log={output.log} defaultChannel={config.defaultChannel ?? 1} connected={output.connection.kind !== 'none'} onSend={send} />}
          {view === 'settings' && (
            <SettingsView
              config={config}
              activeBank={activeBank}
              output={output}
              onPatch={patchConfig}
              onPanic={handlePanic}
              onExport={() => downloadConfig(config)}
              onImport={() => importInputRef.current?.click()}
              onReset={() => {
                if (looper.state !== 'off') looper.toggle()
                updateConfig({ presets: [], fxPads: [] })
                setActiveBank('A')
              }}
            />
          )}
        </main>
      </div>
      {view === 'perform' && <StatusBar last={output.log.last} midiError={output.midi.error} />}
      <BottomTabs view={view} onChange={setView} hideLooper={!showLooper} />
      {importInput}
    </div>
  )
}
