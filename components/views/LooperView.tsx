'use client'

import { useState } from 'react'
import type { LooperBindings, LooperCommands, LooperConfig, MidiMessage } from '@/lib/types'
import { hasRecordedLoop, type UseLooperReturn } from '@/hooks/useLooper'
import { POCKET_MASTER_LOOPER_COMMANDS, POCKET_MASTER_MAX_REC_SECONDS, TIME_SIGNATURES, loopDurationSec, maxBarsFor } from '@/lib/looper'
import { KeyBindingField } from '@/components/KeyBindingField'
import { MidiFields, clampNum } from '@/components/MidiFields'
import { LooperRing } from '@/components/looper/LooperRing'
import { BINDING_LABELS, COMMAND_LABELS, LooperTransport, useBeat } from '@/components/looper/shared'
import { FieldLabel, Hint, monoInputClass, inputClass } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { Stepper } from '@/components/ui/Stepper'
import { StatusChip } from '@/components/ui/StatusChip'
import { GearIcon, WarnIcon } from '@/components/ui/icons'

type Props = {
  looper: UseLooperReturn
  config: LooperConfig
  onChange: (config: LooperConfig) => void
  sendNow: (msg: MidiMessage, source: string) => void
  otherUsedKeys: Set<string>
  isBluetooth: boolean
  isAndroidUsb: boolean
}

type SettingsTab = 'commands' | 'keys' | 'timing'

function LooperSettingsModal({
  config,
  onChange,
  otherUsedKeys,
  onClose,
}: Pick<Props, 'config' | 'onChange' | 'otherUsedKeys'> & { onClose: () => void }) {
  const [tab, setTab] = useState<SettingsTab>('commands')
  const b = config.bindings
  const assignedKeys = BINDING_LABELS.filter((x) => b[x.key]).length

  const setCommand = (key: keyof LooperCommands, msg: MidiMessage) =>
    onChange({ ...config, commands: { ...config.commands, [key]: msg } })

  const usedKeysFor = (key: keyof LooperBindings) =>
    new Set([
      ...otherUsedKeys,
      ...(BINDING_LABELS.filter((x) => x.key !== key).map((x) => b[x.key]).filter(Boolean) as string[]),
    ])

  return (
    <Modal title="Looper settings" onClose={onClose} footer={<div className="flex justify-end"><Button variant="primary" onClick={onClose}>Done</Button></div>}>
      <div className="flex flex-col gap-4">
        <Segmented<SettingsTab>
          label="Settings section"
          options={[
            { value: 'commands', label: `MIDI commands (${COMMAND_LABELS.length})` },
            { value: 'keys', label: `Keyboard keys (${assignedKeys})` },
            { value: 'timing', label: 'Timing' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'commands' && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Hint className="flex-1">Changes save as you type.</Hint>
              <Button
                size="sm"
                onClick={() => onChange({ ...config, commands: POCKET_MASTER_LOOPER_COMMANDS, maxRecSeconds: POCKET_MASTER_MAX_REC_SECONDS })}
              >
                Restore Pocket Master defaults
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COMMAND_LABELS.map(({ key, label }) => (
                <MidiFields key={key} label={label} value={config.commands[key]} onChange={(msg) => setCommand(key, msg)} />
              ))}
            </div>
          </>
        )}

        {tab === 'keys' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {BINDING_LABELS.map(({ key, label }) => (
              <KeyBindingField
                key={key}
                label={label}
                value={b[key]}
                usedKeys={usedKeysFor(key)}
                onChange={(code) => onChange({ ...config, bindings: { ...b, [key]: code } })}
              />
            ))}
          </div>
        )}

        {tab === 'timing' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Max recording (s)</FieldLabel>
              <input
                type="number"
                min={1}
                value={config.maxRecSeconds}
                onChange={(e) => onChange({ ...config, maxRecSeconds: Math.max(1, Number(e.target.value) || 1) })}
                className={monoInputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Latency comp. (ms)</FieldLabel>
              <input
                type="number"
                min={0}
                max={100}
                value={config.latencyCompMs}
                onChange={(e) => onChange({ ...config, latencyCompMs: clampNum(0, 100, e.target.value) })}
                className={monoInputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Loop trim (ms)</FieldLabel>
              <input
                type="number"
                min={-50}
                max={50}
                value={config.loopTrimMs}
                onChange={(e) => onChange({ ...config, loopTrimMs: clampNum(-50, 50, e.target.value) })}
                className={monoInputClass}
              />
              <Hint>Loop falls behind the click: go negative. Runs ahead: go positive.</Hint>
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>
                Click volume <span className="font-mono text-ink">{Math.round(config.clickVolume * 100)}%</span>
              </FieldLabel>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(config.clickVolume * 100)}
                onChange={(e) => onChange({ ...config, clickVolume: Number(e.target.value) / 100 })}
                className="w-full h-11 accent-preset"
              />
            </label>
          </div>
        )}
      </div>
    </Modal>
  )
}

export function LooperView({ looper, config, onChange, sendNow, otherUsedKeys, isBluetooth, isAndroidUsb }: Props) {
  const [placement, setPlacement] = useState<'pre' | 'post' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const beat = useBeat(looper)
  const { state } = looper
  const isOn = state !== 'off'
  const isLocked = hasRecordedLoop(state)
  const durationSec = loopDurationSec(config)
  const maxBars = maxBarsFor(config)
  const signature = `${config.beatsPerBar}/${config.beatUnit}`

  const setVolume = (key: 'recVolume' | 'playVolume', value: number) =>
    onChange({ ...config, commands: { ...config.commands, [key]: { ...config.commands[key], data2: value } } })

  return (
    <div className="p-4 sm:px-7 sm:py-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-2xl font-bold tracking-[-0.01em]">Looper</h1>
        {isOn ? <StatusChip tone="mint">LOOPER ON</StatusChip> : <StatusChip tone="dim">LOOPER OFF</StatusChip>}
        <div className="flex-1" />
        <Button variant={isOn ? 'secondary' : 'primary'} onClick={looper.toggle}>
          {isOn ? 'Turn looper off' : 'Turn looper on'}
        </Button>
      </div>

      {isAndroidUsb && config.clickEnabled && (
        <div className="flex items-start gap-3 rounded-xl border border-preset/35 bg-preset/8 px-3.5 py-3">
          <WarnIcon size={18} className="text-preset shrink-0 mt-px" />
          <span className="text-[13px] leading-normal text-warn-ink">
            On Android, a USB pedal also becomes the audio output, so the click plays through the pedal and can make the
            tablet stutter. If that happens, turn the click off: the looper keeps time without it.
          </span>
        </div>
      )}

      {isBluetooth && (
        <div className="flex items-start gap-3 rounded-xl border border-preset/35 bg-preset/8 px-3.5 py-3">
          <WarnIcon size={18} className="text-preset shrink-0 mt-px" />
          <span className="text-[13px] leading-normal text-warn-ink">
            Connected over Bluetooth: MIDI cannot be scheduled and may lag a few milliseconds, which can pull the loop out of sync
            with the click. For tighter sync, use USB.
          </span>
        </div>
      )}

      {/* Stretch so the ring card and the controls column end at the same line. */}
      <div className="flex flex-wrap gap-6 items-stretch">
        <section aria-label="Loop position" className="flex-[1_1_380px] min-w-0 bg-surface border border-line-soft rounded-[20px] px-6 py-7 flex flex-col items-center justify-center gap-[18px]">
          <LooperRing state={state} beat={beat} bars={config.bars} beatsPerBar={config.beatsPerBar} bpm={config.bpm} signature={signature} />
          <div className="w-full max-w-[360px] flex flex-col gap-1.5">
            <div className="flex justify-between font-mono text-xs text-ink-dim">
              <span>{durationSec.toFixed(1)} s loop</span>
              <span>{config.maxRecSeconds} s pedal limit</span>
            </div>
            <div className="h-2 rounded bg-line-soft overflow-hidden" aria-hidden="true">
              <div
                className={`h-full ${looper.isOverflow ? 'bg-rec' : 'bg-fx'}`}
                style={{ width: `${Math.min(100, (durationSec / config.maxRecSeconds) * 100)}%` }}
              />
            </div>
            <span className={`text-xs ${looper.isOverflow ? 'text-panic' : 'text-ink-dim'}`}>
              {looper.isOverflow
                ? maxBars > 0
                  ? `Too long for the pedal. At ${config.bpm} BPM it fits up to ${maxBars} bar${maxBars > 1 ? 's' : ''}.`
                  : 'Too long for the pedal. Raise the BPM or change the time signature.'
                : `At ${config.bpm} BPM the pedal fits up to ${maxBars} bar${maxBars === 1 ? '' : 's'}.`}
            </span>
          </div>
        </section>

        <section aria-label="Controls" className="flex-[1_1_440px] min-w-0 flex flex-col gap-[18px]">
          <LooperTransport looper={looper} bindings={config.bindings} />
          <span className="text-[13px] text-ink-dim">
            {isOn ? 'REC starts on the next beat 1 and becomes OVERDUB once a loop exists.' : 'Turn the looper on to start the click and record.'}
          </span>

          <div className="flex-1 bg-surface border border-line-soft rounded-pad p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>BPM</FieldLabel>
              <div className="flex gap-2">
                <input
                  type="number"
                  aria-label="BPM"
                  min={20}
                  max={300}
                  value={config.bpm}
                  disabled={isLocked}
                  onChange={(e) => {
                    const bpm = Number(e.target.value)
                    if (bpm >= 20 && bpm <= 300) onChange({ ...config, bpm })
                  }}
                  className={`${monoInputClass} flex-1 disabled:opacity-40`}
                />
                <Button variant="primary" onClick={looper.tap} disabled={isLocked} className="tracking-[0.1em]">
                  TAP
                </Button>
              </div>
            </div>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Time signature</FieldLabel>
              <select
                value={signature}
                disabled={isLocked}
                onChange={(e) => {
                  const [beatsPerBar, beatUnit] = e.target.value.split('/').map(Number)
                  onChange({ ...config, beatsPerBar, beatUnit: beatUnit as 4 | 8 })
                }}
                className={`${inputClass} disabled:opacity-40`}
              >
                {TIME_SIGNATURES.map((ts) => (
                  <option key={`${ts.beatsPerBar}/${ts.beatUnit}`} value={`${ts.beatsPerBar}/${ts.beatUnit}`}>
                    {ts.beatsPerBar}/{ts.beatUnit}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Bars</FieldLabel>
              <Stepper label="bars" value={config.bars} min={1} max={64} disabled={isLocked} onChange={(bars) => onChange({ ...config, bars })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Click</FieldLabel>
              <button
                type="button"
                aria-pressed={config.clickEnabled}
                onClick={looper.toggleClick}
                className={`h-11 rounded-control border text-[13px] font-bold cursor-pointer ${
                  config.clickEnabled ? 'border-preset bg-preset/14 text-preset' : 'border-line bg-surface-2 text-ink-dim'
                }`}
              >
                {config.clickEnabled ? 'Click on' : 'Click off'}
              </button>
            </div>
            {(['recVolume', 'playVolume'] as const).map((key) => (
              <label key={key} className="flex flex-col gap-1.5">
                <FieldLabel>
                  {key === 'recVolume' ? 'Record volume' : 'Playback volume'}{' '}
                  <span className="font-mono text-ink">{config.commands[key].data2}</span>
                </FieldLabel>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={config.commands[key].data2}
                  onChange={(e) => setVolume(key, Number(e.target.value))}
                  // Sending only on release avoids flooding BLE with one write per pixel.
                  onPointerUp={() => sendNow(config.commands[key], key === 'recVolume' ? 'Looper record volume' : 'Looper playback volume')}
                  onKeyUp={() => sendNow(config.commands[key], key === 'recVolume' ? 'Looper record volume' : 'Looper playback volume')}
                  className="w-full h-8 accent-preset"
                />
              </label>
            ))}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <FieldLabel>Placement</FieldLabel>
              <div className="flex gap-2">
                <Segmented
                  label="Placement"
                  className="flex-1"
                  options={[
                    { value: 'pre', label: 'Pre FX' },
                    { value: 'post', label: 'Post FX' },
                  ]}
                  value={placement}
                  onChange={(p) => {
                    sendNow(p === 'pre' ? config.commands.placementPre : config.commands.placementPost, `Looper placement ${p}`)
                    setPlacement(p)
                  }}
                />
                <Button className="shrink-0 h-auto min-h-11" onClick={() => setSettingsOpen(true)} aria-label="Looper settings: MIDI commands, keys and timing">
                  <GearIcon size={18} />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {settingsOpen && (
        <LooperSettingsModal config={config} onChange={onChange} otherUsedKeys={otherUsedKeys} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}
