'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { bankOf, useController } from '@/hooks/useController'
import { useKeyboardBindings } from '@/hooks/useKeyboardBindings'
import { calcDelayMs, useTapTempo, type Subdivision } from '@/hooks/useTapTempo'
import { useLooper } from '@/hooks/useLooper'
import { useOutput } from '@/hooks/useOutput'
import { useAppView } from '@/hooks/useAppView'
import { useSongbook } from '@/hooks/useSongbook'
import { POCKET_MASTER_DELAY_TABLE, findClosestDelayMs } from '@/lib/pocketMasterDelayData'
import { downloadConfig, readConfigFromFile } from '@/lib/storage'
import { resolveLooperConfig } from '@/lib/looper'
import { resolveSongbookConfig } from '@/lib/songbook'
import { buildPanicMessages } from '@/lib/midi'
import { profileOf } from '@/lib/profiles'
import { CFW_TAP_WINDOW_MS, cfwBpm, cfwDelayMs, cfwTempoMessages } from '@/lib/pocketMasterCfwMidi'
import { padKeys } from '@/lib/keys'
import type {
  ControllerConfig,
  FxPad,
  LooperCommands,
  LooperConfig,
  MidiMessage,
  PresetPad,
  PresetTempo,
  SetlistItem,
  SongbookConfig,
  TapTempoBindings,
} from '@/lib/types'
import { COMMAND_LABELS } from '@/components/looper/shared'
import { TopBar } from '@/components/shell/TopBar'
import { BottomTabs, NavRail } from '@/components/shell/Nav'
import { StatusBar } from '@/components/shell/StatusBar'
import { PerformView } from '@/components/views/PerformView'
import { EditView } from '@/components/views/EditView'
import { LooperView } from '@/components/views/LooperView'
import { MonitorView } from '@/components/views/MonitorView'
import { SettingsView } from '@/components/views/SettingsView'
import { SongbookView } from '@/components/views/SongbookView'
import { SetupWizard } from '@/components/setup/SetupWizard'

const MIDI_MSG_DELAY_MS = 60

const SUBDIVISION_LABEL: Record<Subdivision, string> = { eighth: '1/8', dottedEighth: '1/8.', quarter: '1/4' }

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

  const tapDelayMode = profileOf(config).tapDelay
  /** Delay time the pedal ends up with for a tempo. */
  const delayMsFor = (t: PresetTempo) =>
    tapDelayMode === 'tempoCc'
      ? cfwDelayMs(t.bpm, t.subdivision)
      : tapDelayMode === 'sysex'
        ? findClosestDelayMs(calcDelayMs(t.bpm, t.subdivision))
        : null
  const currentTempo: PresetTempo | null =
    tapTempo.isEnabled && tapTempo.bpm !== null ? { bpm: tapTempo.bpm, subdivision: tapTempo.subdivision } : null
  const tempoKey = currentTempo ? `${currentTempo.bpm}:${currentTempo.subdivision}` : null
  /** Last tempo sent to the pedal, so a preset load is not sent twice. */
  const sentTempoKeyRef = useRef<string | null>(null)

  // CFW: the note CC also counts as a tap, so it is only sent when the pedal's note may differ
  // (subdivision changed, tap delay just turned on, new preset) and never twice inside the tap window.
  const cfwNoteRef = useRef<{ sent: Subdivision | null; at: number }>({ sent: null, at: -Infinity })
  const cfwRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearCfwRetry = () => {
    if (cfwRetryRef.current) clearTimeout(cfwRetryRef.current)
    cfwRetryRef.current = null
  }

  /** Sends a tempo to the pedal. `afterPreset`: a preset change was just sent. */
  const pushTempo = (t: PresetTempo, afterPreset = false) => {
    sentTempoKeyRef.current = `${t.bpm}:${t.subdivision}`
    const ms = delayMsFor(t)
    if (tapDelayMode === 'tempoCc') {
      clearCfwRetry()
      const wait = cfwNoteRef.current.at + CFW_TAP_WINDOW_MS - performance.now()
      const noteDue = cfwNoteRef.current.sent !== t.subdivision
      // Too soon for another note: send the tempo now and the note once the window has passed.
      if (noteDue && wait > 0) cfwRetryRef.current = setTimeout(() => pushTempoRef.current(), wait + 50)
      const withNote = noteDue && wait <= 0
      if (withNote) cfwNoteRef.current = { sent: t.subdivision, at: performance.now() }
      const source = `Tap delay ${ms} ms (${cfwBpm(t.bpm)} BPM${withNote ? `, ${SUBDIVISION_LABEL[t.subdivision]}` : ''})`
      cfwTempoMessages(t.bpm, withNote ? t.subdivision : null, config.defaultChannel ?? 1).forEach((m, i) =>
        setTimeout(() => send(m, source), i * MIDI_MSG_DELAY_MS),
      )
    } else if (tapDelayMode === 'sysex' && ms !== null) {
      const bytes = POCKET_MASTER_DELAY_TABLE[ms]
      if (!bytes) return
      // Table entries include a 2-byte BLE MIDI framing header from capture; strip it
      // so both USB (output.send) and BLE (writeBleMidiRaw) receive plain SysEx [0xF0…0xF7]
      const fire = () => sendRaw(bytes.slice(2), `Tap delay ${ms} ms`)
      if (afterPreset) return fire()
      // Prime the device into editor mode, then send delay time 100ms later
      sendRaw(PM_REQUEST_PRESET_STATE, 'Tap delay: editor mode')
      setTimeout(fire, 100)
    }
  }

  /** Resends whatever tempo is current (CFW note retry). */
  const pushTempoRef = useRef<() => void>(() => {})
  useLayoutEffect(() => {
    pushTempoRef.current = () => {
      if (currentTempo) pushTempo(currentTempo)
    }
  })

  useEffect(() => {
    if (tempoKey === null) {
      // Turning tap delay back on must resend the note: the pedal may have changed meanwhile.
      sentTempoKeyRef.current = null
      cfwNoteRef.current = { ...cfwNoteRef.current, sent: null }
      clearCfwRetry()
      return
    }
    if (tempoKey === sentTempoKeyRef.current) return
    const timer = setTimeout(() => {
      if (tempoKey !== sentTempoKeyRef.current) pushTempoRef.current()
    }, 500)
    return () => clearTimeout(timer)
  }, [tempoKey])

  // Taps, subdivision changes and "turn off" are kept in the active preset; loading a preset is not.
  const tempoEditedRef = useRef(false)
  const editTempo = <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => {
    tempoEditedRef.current = true
    fn(...args)
  }
  const tapControls = {
    ...tapTempo,
    tap: editTempo(tapTempo.tap),
    cycleSubdivision: editTempo(tapTempo.cycleSubdivision),
    setSubdivision: editTempo(tapTempo.setSubdivision),
    disable: editTempo(tapTempo.disable),
  }
  useEffect(() => {
    if (!tempoEditedRef.current || !activePresetId || tapDelayMode === null) return
    tempoEditedRef.current = false
    const preset = config.presets.find((p) => p.id === activePresetId)
    if (!preset) return
    const tempo = currentTempo ?? undefined
    if (JSON.stringify(preset.tempo) === JSON.stringify(tempo)) return
    patchConfig({ presets: config.presets.map((p) => (p.id === preset.id ? { ...p, tempo } : p)) })
    // Only the tempo key matters here: config is read when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempoKey])

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
      if (preset && tapDelayMode !== null) {
        // The pedal now plays the preset's own tempo and note; the app's copy (if any) replaces them.
        tempoEditedRef.current = false
        cfwNoteRef.current = { ...cfwNoteRef.current, sent: null }
        tapTempo.load(preset.tempo ?? null)
        const tempo = preset.tempo
        if (tempo) {
          sentTempoKeyRef.current = `${tempo.bpm}:${tempo.subdivision}`
          setTimeout(() => pushTempo(tempo, true), MIDI_MSG_DELAY_MS)
        }
      }
    }
  }

  // A song's preset is only sent when it differs: pressing the active preset again would enter solo mode.
  const handleEnterSong = (item: SetlistItem) => {
    const preset = config.presets.find((p) => p.id === item.presetId)
    if (!preset || preset.id === activePresetId) return
    setActiveBank(bankOf(preset))
    handlePresetClick(preset.id)
  }
  const songbook = useSongbook({ onEnterSong: handleEnterSong })
  const songbookConfig = resolveSongbookConfig(config.songbook)
  const handleUpdateSongbook = (songbook: SongbookConfig) => patchConfig({ songbook })

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
  const songbookKeys = Object.values(songbookConfig.bindings).filter(Boolean) as string[]
  const tapOtherUsedKeys = new Set([...allPadKeys, ...looperKeys, ...songbookKeys])
  const looperOtherUsedKeys = new Set([...allPadKeys, ...tapKeys, ...songbookKeys])
  const songbookOtherUsedKeys = new Set([...allPadKeys, ...tapKeys, ...looperKeys])

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

  const songbookActions = useMemo(
    () => ({ prev: songbook.prev, next: songbook.next, menu: songbook.menu, confirm: songbook.confirm }),
    [songbook.prev, songbook.next, songbook.menu, songbook.confirm],
  )

  const hasConfig = config.presets.length > 0 || config.fxPads.length > 0
  const showLooper = config.showLooper !== false

  useKeyboardBindings({
    config,
    activeBank,
    onPresetPad: handlePresetClick,
    onFxPad: handleToggleFx,
    onTap: tapControls.tap,
    onCycleSubdivision: tapControls.cycleSubdivision,
    onDisable: tapControls.disable,
    looperBindings: looperConfig.bindings,
    looperActions,
    songbookBindings: view === 'songbook' && songbook.run ? songbookConfig.bindings : null,
    songbookActions,
    // Editing and settings use the keyboard for typing and key capture.
    enabled: hasConfig && (view === 'perform' || view === 'songbook' || view === 'looper' || view === 'monitor'),
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
              tapTempo={tapControls}
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
          {view === 'songbook' && (
            <SongbookView
              songbook={songbook}
              config={songbookConfig}
              onChange={handleUpdateSongbook}
              presets={config.presets}
              presetControl={{ activeBank, onBankChange: setActiveBank, activePresetId, soloPresetId, onPreset: handlePresetClick }}
              otherUsedKeys={songbookOtherUsedKeys}
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
