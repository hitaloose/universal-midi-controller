'use client'

import { useEffect, useState } from 'react'
import type { LooperBindings, LooperCommands, LooperConfig, MidiMessage } from '@/lib/types'
import { hasRecordedLoop, type BeatInfo, type LooperState, type UseLooperReturn } from '@/hooks/useLooper'
import { POCKET_MASTER_LOOPER_COMMANDS, POCKET_MASTER_MAX_REC_SECONDS, TIME_SIGNATURES, loopDurationSec, maxBarsFor } from '@/lib/looper'
import { KeyBindingField, formatKeyCode } from '@/components/KeyBindingField'
import { MidiFields } from '@/components/MidiFields'

const STATE_LABELS: Record<LooperState, string> = {
  off: '',
  empty: 'Ready',
  armedRec: 'REC on next 1…',
  recording: 'Recording',
  playing: 'Playing',
  armedOverdub: 'Overdub at loop start…',
  overdubbing: 'Overdub',
  stopped: 'Stopped',
  armedPlay: 'Play on next 1…',
}

const COMMAND_LABELS: { key: keyof LooperCommands; label: string }[] = [
  { key: 'on', label: 'Looper ON' },
  { key: 'off', label: 'Looper OFF' },
  { key: 'recStart', label: 'Start recording' },
  { key: 'recStop', label: 'Stop recording' },
  { key: 'overdubStart', label: 'Start overdub' },
  { key: 'overdubStop', label: 'Stop overdub' },
  { key: 'play', label: 'Play' },
  { key: 'stop', label: 'Stop' },
  { key: 'clear', label: 'Clear loop' },
  { key: 'placementPre', label: 'Pre placement' },
  { key: 'placementPost', label: 'Post placement' },
  { key: 'recVolume', label: 'Record volume (Data 2 = slider)' },
  { key: 'playVolume', label: 'Playback volume (Data 2 = slider)' },
]

const BINDING_LABELS: { key: keyof LooperBindings; label: string }[] = [
  { key: 'toggle', label: 'Looper ON/OFF' },
  { key: 'rec', label: 'REC / Overdub' },
  { key: 'playStop', label: 'Play/Stop' },
  { key: 'clear', label: 'Clear' },
  { key: 'click', label: 'Click on/off' },
  { key: 'tap', label: 'Tap BPM' },
]

type Props = {
  looper: UseLooperReturn
  config: LooperConfig
  onChange: (config: LooperConfig) => void
  sendNow: (msg: MidiMessage) => void
  otherUsedKeys: Set<string>
  onConfigOpenChange: (open: boolean) => void
  isBluetooth: boolean
}

function KeyHint({ code }: { code?: string }) {
  if (!code) return null
  return <span className="text-xs font-mono text-zinc-500">[{formatKeyCode(code)}]</span>
}

function BeatDots({ looper }: { looper: UseLooperReturn }) {
  const [beat, setBeat] = useState<BeatInfo | null>(null)
  const { subscribeBeat } = looper
  useEffect(() => subscribeBeat(setBeat), [subscribeBeat])
  if (!beat) return <div className="h-3" />
  return (
    <div className="flex items-center gap-3">
      {beat.loopBar !== null && (
        <span className="text-lg font-bold font-mono tabular-nums text-white" title="Loop bar">
          {beat.loopBar}
          <span className="text-zinc-500">/{beat.bars}</span>
        </span>
      )}
      <div className="flex gap-1.5">
        {Array.from({ length: beat.beatsPerBar }, (_, i) => (
          <div
            key={i}
            className={[
              'w-3 h-3 rounded-full transition-colors duration-75',
              i === beat.beatInBar
                ? i === 0
                  ? 'bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.7)]'
                  : 'bg-indigo-400'
                : 'bg-zinc-700',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  )
}

export function LooperBlock({ looper, config, onChange, sendNow, otherUsedKeys, onConfigOpenChange, isBluetooth }: Props) {
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [placement, setPlacement] = useState<'pre' | 'post' | null>(null)
  const { state } = looper
  const isOn = state !== 'off'
  const isLocked = hasRecordedLoop(state)
  // Once a loop exists, the REC pad becomes the overdub pad.
  const isDubMode = isLocked && state !== 'recording'
  const durationSec = loopDurationSec(config)
  const maxBars = maxBarsFor(config)
  const b = config.bindings

  useEffect(() => {
    onConfigOpenChange(isConfigOpen)
  }, [isConfigOpen, onConfigOpenChange])

  const setCommand = (key: keyof LooperCommands, msg: MidiMessage) =>
    onChange({ ...config, commands: { ...config.commands, [key]: msg } })

  const setVolume = (key: 'recVolume' | 'playVolume', value: number) =>
    setCommand(key, { ...config.commands[key], data2: value })

  const usedKeysFor = (key: keyof LooperBindings) =>
    new Set([
      ...otherUsedKeys,
      ...BINDING_LABELS.filter((x) => x.key !== key).map((x) => b[x.key]).filter(Boolean) as string[],
    ])

  const padClass = (active: boolean, armed: boolean, color: string) =>
    [
      'w-full flex flex-col items-center justify-center gap-1 rounded-lg p-3 h-20 sm:h-24 text-center transition-colors select-none disabled:opacity-30 disabled:cursor-not-allowed',
      active ? `${color} text-white` : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
      armed ? 'ring-2 ring-inset ring-white/70 animate-pulse' : '',
    ].join(' ')

  const inputClass =
    'bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-40'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Looper</span>
        <button
          onClick={() => setIsConfigOpen((v) => !v)}
          title="Configure looper"
          className={[
            'w-5 h-5 flex items-center justify-center rounded transition-colors text-zinc-600 hover:text-zinc-300',
            isConfigOpen ? 'text-indigo-400' : '',
          ].join(' ')}
        >
          ⚙
        </button>
        <button
          onClick={looper.toggle}
          className={[
            'ml-auto text-xs font-bold tracking-wider rounded-full px-3 py-1 transition-colors',
            isOn ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
          ].join(' ')}
        >
          {isOn ? 'LOOPER ON' : 'LOOPER OFF'}
        </button>
        <KeyHint code={b.toggle} />
      </div>
      <p
        className={[
          'text-[11px] leading-snug text-right',
          isBluetooth ? 'text-amber-400' : 'text-zinc-600',
        ].join(' ')}
      >
        {isBluetooth ? '⚠ Connected via Bluetooth: ' : 'ⓘ '}
        Bluetooth can’t schedule MIDI sends and may lag a few ms, pushing the loop out of sync with the click. For
        tighter sync, use the looper over USB.
      </p>

      {isOn && (
        <div className="flex flex-col gap-3 bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <BeatDots looper={looper} />
            <span
              className={[
                'text-xs font-semibold uppercase tracking-wider',
                state === 'recording' ? 'text-red-400' : state === 'overdubbing' ? 'text-amber-400' : 'text-zinc-400',
              ].join(' ')}
            >
              {STATE_LABELS[state]}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1 min-w-0">
              {isDubMode ? (
                <button
                  onClick={looper.record}
                  disabled={state === 'stopped' || state === 'armedPlay'}
                  className={padClass(state === 'overdubbing', state === 'armedOverdub', 'bg-amber-600')}
                >
                  <span className="text-lg">⊕</span>
                  <span className="text-sm font-bold">OVERDUB</span>
                </button>
              ) : (
                <button
                  onClick={looper.record}
                  disabled={state === 'empty' && looper.isOverflow}
                  className={padClass(state === 'recording', state === 'armedRec', 'bg-red-700')}
                >
                  <span className="text-lg">●</span>
                  <span className="text-sm font-bold">REC</span>
                </button>
              )}
              <KeyHint code={b.rec} />
            </div>
            <div className="flex flex-col items-center gap-1 min-w-0">
              <button
                onClick={looper.playStop}
                disabled={state === 'empty' || state === 'recording'}
                className={padClass(
                  state === 'playing' || state === 'armedOverdub' || state === 'overdubbing',
                  state === 'armedPlay',
                  'bg-emerald-700',
                )}
              >
                <span className="text-lg">{state === 'stopped' || state === 'armedPlay' ? '▶' : '■'}</span>
                <span className="text-sm font-bold">
                  {state === 'stopped' || state === 'armedPlay' ? 'PLAY' : 'STOP'}
                </span>
              </button>
              <KeyHint code={b.playStop} />
            </div>
            <div className="flex flex-col items-center gap-1 min-w-0">
              <button onClick={looper.clear} className={padClass(false, false, '')}>
                <span className="text-lg">✕</span>
                <span className="text-sm font-bold">CLEAR</span>
              </button>
              <KeyHint code={b.clear} />
            </div>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">BPM</span>
              <div className="flex gap-1">
                <input
                  type="number"
                  min={20}
                  max={300}
                  value={config.bpm}
                  disabled={isLocked}
                  onChange={(e) => {
                    const bpm = Number(e.target.value)
                    if (bpm >= 20 && bpm <= 300) onChange({ ...config, bpm })
                  }}
                  className={`${inputClass} w-20`}
                />
                <button
                  onClick={looper.tap}
                  disabled={isLocked}
                  className="text-xs font-bold bg-zinc-800 hover:bg-zinc-700 rounded px-2 text-zinc-300 disabled:opacity-40"
                >
                  TAP
                </button>
              </div>
              <KeyHint code={b.tap} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Time signature</span>
              <select
                value={`${config.beatsPerBar}/${config.beatUnit}`}
                disabled={isLocked}
                onChange={(e) => {
                  const [beatsPerBar, beatUnit] = e.target.value.split('/').map(Number)
                  onChange({ ...config, beatsPerBar, beatUnit: beatUnit as 4 | 8 })
                }}
                className={inputClass}
              >
                {TIME_SIGNATURES.map((ts) => (
                  <option key={`${ts.beatsPerBar}/${ts.beatUnit}`} value={`${ts.beatsPerBar}/${ts.beatUnit}`}>
                    {ts.beatsPerBar}/{ts.beatUnit}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Bars</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onChange({ ...config, bars: Math.max(1, config.bars - 1) })}
                  disabled={isLocked || config.bars <= 1}
                  className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-mono">{config.bars}</span>
                <button
                  onClick={() => onChange({ ...config, bars: config.bars + 1 })}
                  disabled={isLocked}
                  className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Click</span>
              <button
                onClick={looper.toggleClick}
                className={[
                  'h-7 px-2 rounded text-sm transition-colors',
                  config.clickEnabled ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500',
                ].join(' ')}
              >
                {config.clickEnabled ? '🔊' : '🔇'}
              </button>
              <KeyHint code={b.click} />
            </div>
            <span
              className={[
                'text-xs font-mono ml-auto self-center',
                looper.isOverflow ? 'text-red-400' : 'text-zinc-500',
              ].join(' ')}
            >
              {durationSec.toFixed(1)} s / {config.maxRecSeconds} s
            </span>
          </div>

          {looper.isOverflow && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-2 py-1.5">
              ⚠ {durationSec.toFixed(1)} s loop exceeds the pedalboard’s {config.maxRecSeconds} s
              maximum.{' '}
              {maxBars > 0
                ? `Maximum of ${maxBars} bar${maxBars > 1 ? 's' : ''} at ${config.bpm} BPM.`
                : 'Increase the BPM or change the time signature.'}
            </p>
          )}

          <div className="flex items-end gap-4 flex-wrap">
            {(['recVolume', 'playVolume'] as const).map((key) => (
              <label key={key} className="flex flex-col gap-1 flex-1 min-w-[120px]">
                <span className="text-xs text-zinc-500">
                  {key === 'recVolume' ? 'Rec vol.' : 'Play vol.'}: {config.commands[key].data2}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={config.commands[key].data2}
                  onChange={(e) => setVolume(key, Number(e.target.value))}
                  // Sending only on release avoids flooding BLE with one write per pixel.
                  onPointerUp={() => sendNow(config.commands[key])}
                  onKeyUp={() => sendNow(config.commands[key])}
                  className="accent-indigo-500"
                />
              </label>
            ))}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Placement</span>
              <div className="flex rounded overflow-hidden border border-zinc-700">
                {(['pre', 'post'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      sendNow(p === 'pre' ? config.commands.placementPre : config.commands.placementPost)
                      setPlacement(p)
                    }}
                    className={[
                      'px-3 h-7 text-xs font-semibold uppercase transition-colors',
                      placement === p ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
                    ].join(' ')}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isConfigOpen && (
        <div className="mt-1 flex flex-col gap-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Max recording time (s)</span>
              <input
                type="number"
                min={1}
                value={config.maxRecSeconds}
                onChange={(e) => onChange({ ...config, maxRecSeconds: Math.max(1, Number(e.target.value)) })}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Latency compensation (ms)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={config.latencyCompMs}
                onChange={(e) =>
                  onChange({ ...config, latencyCompMs: Math.min(100, Math.max(0, Number(e.target.value))) })
                }
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Click volume: {Math.round(config.clickVolume * 100)}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(config.clickVolume * 100)}
                onChange={(e) => onChange({ ...config, clickVolume: Number(e.target.value) / 100 })}
                className="accent-indigo-500 mt-2"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">MIDI commands</p>
            <button
              onClick={() =>
                onChange({
                  ...config,
                  commands: POCKET_MASTER_LOOPER_COMMANDS,
                  maxRecSeconds: POCKET_MASTER_MAX_REC_SECONDS,
                })
              }
              className="text-xs text-zinc-400 hover:text-indigo-400 transition-colors"
            >
              Restore Pocket Master defaults
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMMAND_LABELS.map(({ key, label }) => (
              <MidiFields key={key} label={label} value={config.commands[key]} onChange={(msg) => setCommand(key, msg)} />
            ))}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Keyboard keys</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BINDING_LABELS.map(({ key, label }) => (
              <div key={key}>
                <p className="text-xs text-zinc-400 mb-1.5">{label}</p>
                <KeyBindingField
                  value={b[key]}
                  usedKeys={usedKeysFor(key)}
                  onChange={(code) => onChange({ ...config, bindings: { ...b, [key]: code } })}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
