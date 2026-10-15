'use client'

import { useState } from 'react'
import type { BankId, ControllerConfig, PedalboardType } from '@/lib/types'
import type { UseOutputReturn } from '@/hooks/useOutput'
import { presetsInBank } from '@/hooks/useController'
import { PROFILES, PROFILE_ORDER } from '@/lib/profiles'
import { formatKeyCode } from '@/components/KeyBindingField'
import { DeviceList } from '@/components/DeviceList'
import { Card, FieldLabel, Hint, SectionTitle, inputClass, monoInputClass } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import pkg from '@/package.json'

type Owner = 'preset' | 'fx' | 'global'

const KEY_ROWS: string[][] = [
  ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'],
  ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM'],
  ['Space', 'Enter', 'Backspace', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'],
]

const OWNER_STYLE: Record<Owner, string> = {
  preset: 'bg-preset text-[#14130F]',
  fx: 'bg-fx text-[#14130F]',
  global: 'bg-edit text-[#14130F]',
}

function keyOwners(config: ControllerConfig, bank: BankId): Map<string, { owner: Owner; label: string }> {
  const map = new Map<string, { owner: Owner; label: string }>()
  for (const p of presetsInBank(config, bank)) if (p.keyBinding) map.set(p.keyBinding, { owner: 'preset', label: p.name })
  for (const f of config.fxPads) if (f.keyBinding) map.set(f.keyBinding, { owner: 'fx', label: f.name })
  const tap = config.tapTempoBindings ?? {}
  if (tap.tap) map.set(tap.tap, { owner: 'global', label: 'Tap delay: TAP' })
  if (tap.cycleSubdivision) map.set(tap.cycleSubdivision, { owner: 'global', label: 'Tap delay: subdivision' })
  if (tap.disable) map.set(tap.disable, { owner: 'global', label: 'Tap delay: off' })
  for (const [action, code] of Object.entries(config.looper?.bindings ?? {}))
    if (code) map.set(code, { owner: 'global', label: `Looper: ${action}` })
  return map
}

type Props = {
  config: ControllerConfig
  activeBank: BankId
  output: UseOutputReturn
  onPatch: (partial: Partial<ControllerConfig>) => void
  onPanic: () => void
  onExport: () => void
  onImport: () => void
  onReset: () => void
}

export function SettingsView({ config, activeBank, output, onPatch, onPanic, onExport, onImport, onReset }: Props) {
  const [confirmReset, setConfirmReset] = useState(false)
  const { midi, bt } = output
  const owners = keyOwners(config, activeBank)
  const mappedCodes = new Set(KEY_ROWS.flat())
  const otherKeys = [...owners.entries()].filter(([code]) => !mappedCodes.has(code))
  const swControlled = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller

  return (
    <div className="p-4 sm:px-7 sm:py-6 flex flex-col gap-5">
      <h1 className="m-0 text-2xl font-bold tracking-[-0.01em]">Settings</h1>
      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex-[1_1_420px] min-w-0 flex flex-col gap-5">
          <Card label="Pedalboard">
            <SectionTitle>Pedalboard</SectionTitle>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Profile</FieldLabel>
              <select
                value={config.pedalboardType ?? 'outros'}
                onChange={(e) => onPatch({ pedalboardType: e.target.value as PedalboardType })}
                className={inputClass}
              >
                {PROFILE_ORDER.map((t) => (
                  <option key={t} value={t}>{PROFILES[t].label}</option>
                ))}
              </select>
            </label>
            <Hint>Changing the profile keeps your pads and only swaps the shortcuts and extra blocks.</Hint>
          </Card>

          <Card label="MIDI output">
            <SectionTitle>MIDI output</SectionTitle>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>USB device</FieldLabel>
              <DeviceList outputs={midi.outputs} selectedOutputId={midi.selectedOutputId} onSelect={midi.setSelectedOutputId} error={midi.error} />
            </div>
            {bt.isSupported && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 rounded-xl border border-line bg-ground px-3.5 py-3">
                  <span className="flex flex-col flex-1 min-w-0">
                    <span className="text-[15px] font-bold truncate">Bluetooth</span>
                    <span className={`text-xs truncate ${bt.device ? 'text-fx' : 'text-ink-dim'}`}>
                      {bt.device ? `${bt.device.name} · connected` : 'Not connected'}
                    </span>
                  </span>
                  {bt.device ? (
                    <Button size="sm" onClick={bt.disconnect}>Disconnect</Button>
                  ) : (
                    <Button size="sm" onClick={bt.connect} disabled={bt.isConnecting}>
                      {bt.isConnecting ? 'Connecting…' : 'Pair device'}
                    </Button>
                  )}
                </div>
                {bt.connectError && <span className="text-xs text-panic">{bt.connectError}</span>}
                {bt.device && <Hint>While Bluetooth is connected, MIDI goes there instead of USB.</Hint>}
              </div>
            )}
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Default channel</FieldLabel>
              <input
                type="number"
                min={1}
                max={16}
                value={config.defaultChannel ?? 1}
                onChange={(e) => onPatch({ defaultChannel: Math.min(16, Math.max(1, Number(e.target.value) || 1)) })}
                className={`${monoInputClass} w-28`}
              />
              <Hint>Used for new pads. Existing pads keep their own channel.</Hint>
            </label>
          </Card>

          <Card label="Safety">
            <SectionTitle>Safety</SectionTitle>
            <Hint>Panic sends All Notes Off and All Sound Off on every channel. It is always one tap away in the top bar.</Hint>
            <Button variant="danger" className="self-start" onClick={onPanic}>Send panic now</Button>
          </Card>
        </div>

        <div className="flex-[1_1_420px] min-w-0 flex flex-col gap-5">
          <Card label="Keyboard map">
            <div className="flex items-baseline gap-3">
              <SectionTitle>Keyboard map</SectionTitle>
              <span className="text-xs text-ink-dim">Bank {activeBank}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {KEY_ROWS.map((row, i) => (
                <div key={i} className="flex gap-1.5">
                  {row.map((code) => {
                    const o = owners.get(code)
                    return (
                      <span
                        key={code}
                        title={o ? o.label : 'Free'}
                        aria-label={`${formatKeyCode(code)}: ${o ? o.label : 'free'}`}
                        className={`box-border flex-1 min-w-0 h-10 rounded-lg flex items-center justify-center font-mono text-xs font-bold truncate ${
                          o ? OWNER_STYLE[o.owner] : 'bg-surface-2 text-ink-mute border border-line'
                        } ${code === 'Space' ? 'flex-[2]' : ''}`}
                      >
                        {formatKeyCode(code)}
                      </span>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-ink-dim">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-preset" />Preset</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-fx" />FX</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-edit" />Tap / looper</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-surface-2 border border-line" />Free</span>
            </div>
            {otherKeys.length > 0 && (
              <Hint>
                Also assigned: {otherKeys.map(([code, o]) => `${formatKeyCode(code)} (${o.label})`).join(', ')}
              </Hint>
            )}
            <Hint>Assign keys in Edit (pads), on the tap delay card and in the Looper.</Hint>
          </Card>

          <Card label="Backup">
            <SectionTitle>Backup</SectionTitle>
            <Hint>Your setup is stored in this browser. Export it as a JSON file to keep a copy or move to another device.</Hint>
            <div className="flex flex-wrap gap-2.5">
              <Button onClick={onExport}>Export setup</Button>
              <Button onClick={onImport}>Import setup</Button>
              {confirmReset ? (
                <>
                  <Button variant="danger" onClick={() => { setConfirmReset(false); onReset() }}>Erase everything</Button>
                  <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
                </>
              ) : (
                <Button variant="ghost" className="text-panic" onClick={() => setConfirmReset(true)}>Reset controller</Button>
              )}
            </div>
          </Card>

          <section aria-label="About" className="flex flex-wrap items-center gap-3 px-1 text-[13px] text-ink-dim">
            <span className="flex items-center gap-2">
              <span className={`w-[7px] h-[7px] rounded-full ${swControlled ? 'bg-fx' : 'bg-ink-mute'}`} />
              {swControlled ? 'Installed · works offline' : 'Online only'}
            </span>
            <div className="flex-1" />
            <a href="https://github.com/hitaloose/universal-midi-controller" target="_blank" rel="noopener noreferrer" className="text-preset">
              Source on GitHub
            </a>
            <span className="font-mono">v{pkg.version}</span>
          </section>
        </div>
      </div>
    </div>
  )
}
