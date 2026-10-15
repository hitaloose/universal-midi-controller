'use client'

import { useState } from 'react'
import type { BankId, FxPad, MidiMessage, PresetPad } from '@/lib/types'
import { BANK_IDS } from '@/lib/types'
import type { PedalboardProfile } from '@/lib/profiles'
import { PAD_COLORS, padColor } from '@/lib/padColors'
import { KeyBindingField } from '@/components/KeyBindingField'
import { MidiFields } from '@/components/MidiFields'
import { FieldLabel, Hint, inputClass } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { ChevronLeft, ChevronRight, CloseIcon, CopyIcon } from '@/components/ui/icons'
import { describeMidi } from '@/lib/profiles'

type Props = {
  preset: PresetPad
  index: number
  fxPads: FxPad[]
  profile: PedalboardProfile
  usedKeys: Set<string>
  canMoveLeft: boolean
  canMoveRight: boolean
  onSave: (p: PresetPad) => void
  onRemove: () => void
  onDuplicate: () => void
  onMove: (dir: -1 | 1) => void
  onClose: () => void
  onSendTest: (msg: MidiMessage) => void
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export function PresetInspector(props: Props) {
  const { preset, fxPads, profile } = props
  const [draft, setDraft] = useState<PresetPad>(preset)
  const [showRaw, setShowRaw] = useState(false)
  const set = (patch: Partial<PresetPad>) => setDraft((d) => ({ ...d, ...patch }))

  const presetNumber = profile.presetNumber(draft.midi)
  const [min, max] = profile.presetRange
  const setNumber = (n: number) => set({ midi: profile.presetMidi(Math.min(max, Math.max(min, n)), draft.midi.channel) })
  const isPocketMaster = profile.type === 'pocketMaster'
  const pmBank = presetNumber !== null && presetNumber > 50 ? 'F' : 'P'
  const color = padColor(draft.color)
  const dirty = JSON.stringify(draft) !== JSON.stringify(preset)

  return (
    <>
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-line-soft">
        <span className="w-3 h-3 rounded-full" style={{ background: color.hex }} aria-hidden="true" />
        <h2 className="m-0 text-lg font-bold">Preset {pad2(props.index + 1)}</h2>
        <span className="text-xs font-bold text-edit bg-edit/12 rounded-full px-2.5 py-0.5">Selected</span>
        <div className="flex-1" />
        <button type="button" aria-label="Duplicate preset" onClick={props.onDuplicate} className="w-11 h-11 flex items-center justify-center rounded-control text-ink-dim hover:text-ink hover:bg-surface cursor-pointer">
          <CopyIcon size={18} />
        </button>
        <button type="button" aria-label="Close inspector" onClick={props.onClose} className="w-11 h-11 flex items-center justify-center rounded-control text-ink-dim hover:text-ink hover:bg-surface cursor-pointer">
          <CloseIcon size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Name</FieldLabel>
          <input value={draft.name} onChange={(e) => set({ name: e.target.value })} className={inputClass} />
        </label>

        <div className="flex flex-wrap gap-5">
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Color</FieldLabel>
            <div className="flex gap-2">
              {PAD_COLORS.map((c) => {
                const on = (draft.color ?? 'amber') === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={c.label}
                    aria-pressed={on}
                    onClick={() => set({ color: c.id })}
                    className={`w-9 h-9 rounded-full cursor-pointer ${on ? 'ring-2 ring-ink ring-offset-2 ring-offset-bar' : ''}`}
                    style={{ background: c.hex }}
                  />
                )
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Bank</FieldLabel>
            <Segmented<BankId>
              label="Bank"
              size="sm"
              options={BANK_IDS.map((b) => ({ value: b, label: b }))}
              value={draft.bank ?? 'A'}
              onChange={(bank) => set({ bank })}
            />
          </div>
        </div>

        <KeyBindingField value={draft.keyBinding} usedKeys={props.usedKeys} onChange={(keyBinding) => set({ keyBinding })} />

        <div className="flex flex-col gap-2">
          <FieldLabel>{profile.presetLabel}</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            {isPocketMaster && (
              <Segmented
                label="Pocket Master bank"
                size="sm"
                options={[
                  { value: 'P', label: 'P' },
                  { value: 'F', label: 'F' },
                ]}
                value={presetNumber === null ? null : pmBank}
                onChange={(b) => {
                  const local = presetNumber === null ? 1 : presetNumber > 50 ? presetNumber - 50 : presetNumber
                  setNumber(b === 'F' ? local + 50 : local)
                }}
              />
            )}
            <button type="button" aria-label="Previous number" onClick={() => setNumber((presetNumber ?? min + 1) - 1)} className="w-11 h-11 rounded-control border border-line bg-surface-2 text-lg cursor-pointer">
              −
            </button>
            <span className="font-mono text-[22px] font-bold min-w-16 text-center">
              {presetNumber === null ? '--' : isPocketMaster ? pad2(presetNumber > 50 ? presetNumber - 50 : presetNumber) : pad2(presetNumber)}
            </span>
            <button type="button" aria-label="Next number" onClick={() => setNumber((presetNumber ?? min - 1) + 1)} className="w-11 h-11 rounded-control border border-line bg-surface-2 text-lg cursor-pointer">
              +
            </button>
            <div className="flex-1" />
            <Button size="sm" onClick={() => props.onSendTest(draft.midi)}>Send test</Button>
          </div>
          <Hint>
            Sends {describeMidi(draft.midi)} on channel {draft.midi.channel}
            {presetNumber !== null ? ` (${profile.formatPreset(presetNumber)})` : ''}.
          </Hint>
        </div>

        {fxPads.length > 0 && (
          <div className="flex flex-col gap-2">
            <FieldLabel>FX behavior</FieldLabel>
            <div className="border border-line-soft rounded-xl overflow-hidden">
              <div className="grid grid-cols-[minmax(0,1fr)_52px_52px_minmax(0,1fr)] gap-2 px-3 py-2 bg-surface text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-dim">
                <span>FX</span>
                <span className="text-center">Start</span>
                <span className="text-center">Solo</span>
                <span>Alias</span>
              </div>
              {fxPads.map((fx) => (
                <div key={fx.id} className="grid grid-cols-[minmax(0,1fr)_52px_52px_minmax(0,1fr)] gap-2 px-3 py-1.5 border-t border-line-soft items-center">
                  <span className="text-sm font-semibold truncate">{fx.name}</span>
                  <span className="flex justify-center">
                    <input
                      type="checkbox"
                      aria-label={`${fx.name} on at preset start`}
                      checked={draft.fxInitialStates[fx.id] ?? false}
                      onChange={(e) => set({ fxInitialStates: { ...draft.fxInitialStates, [fx.id]: e.target.checked } })}
                      className="w-5 h-5 accent-fx cursor-pointer"
                    />
                  </span>
                  <span className="flex justify-center">
                    <input
                      type="checkbox"
                      aria-label={`${fx.name} on in solo mode`}
                      checked={draft.fxSoloStates[fx.id] ?? false}
                      onChange={(e) => set({ fxSoloStates: { ...draft.fxSoloStates, [fx.id]: e.target.checked } })}
                      className="w-5 h-5 accent-solo cursor-pointer"
                    />
                  </span>
                  <input
                    aria-label={`${fx.name} alias in this preset`}
                    placeholder={fx.name}
                    value={draft.fxAliases?.[fx.id] ?? ''}
                    onChange={(e) => set({ fxAliases: { ...draft.fxAliases, [fx.id]: e.target.value } })}
                    className="box-border h-9 rounded-lg border border-line bg-ground text-ink px-2 text-sm min-w-0"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <FieldLabel>Position</FieldLabel>
          <div className="flex gap-2">
            <Button size="sm" disabled={!props.canMoveLeft} onClick={() => props.onMove(-1)} aria-label="Move left">
              <ChevronLeft size={16} /> Move left
            </Button>
            <Button size="sm" disabled={!props.canMoveRight} onClick={() => props.onMove(1)} aria-label="Move right">
              Move right <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        <button
          type="button"
          aria-expanded={showRaw}
          onClick={() => setShowRaw((v) => !v)}
          className="flex items-center justify-between h-12 px-4 rounded-xl border border-line-soft bg-surface text-sm font-semibold cursor-pointer"
        >
          <span>Advanced: raw MIDI command</span>
          <span className="text-ink-dim" aria-hidden="true">{showRaw ? '−' : '+'}</span>
        </button>
        {showRaw && <MidiFields label="MIDI command" value={draft.midi} onChange={(midi) => set({ midi })} />}
      </div>

      <div className="flex items-center gap-2 px-5 py-3.5 border-t border-line-soft">
        <button type="button" onClick={props.onRemove} className="h-11 px-3 text-[13px] font-semibold text-panic hover:underline cursor-pointer">
          Remove
        </button>
        <div className="flex-1" />
        <Button disabled={!dirty} onClick={() => setDraft(preset)}>Discard</Button>
        <Button variant="primary" disabled={!dirty} onClick={() => props.onSave(draft)}>Save preset</Button>
      </div>
    </>
  )
}
