'use client'

import { useState } from 'react'
import type { BankId, ControllerConfig, FxPad, MidiMessage, PresetPad } from '@/lib/types'
import { BANK_IDS } from '@/lib/types'
import { bankOf, presetsInBank } from '@/hooks/useController'
import { describeMidi, describePresetMidi, profileOf } from '@/lib/profiles'
import { padColor } from '@/lib/padColors'
import { usedKeysFor } from '@/lib/keys'
import { BankBar } from '@/components/perform/BankBar'
import { KeyCap } from '@/components/ui/KeyCap'
import { SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { PlusIcon } from '@/components/ui/icons'
import { PresetInspector } from '@/components/edit/PresetInspector'
import { FxInspector } from '@/components/edit/FxInspector'

type Selection = { kind: 'preset'; id: string } | { kind: 'fx'; id: string } | null

type Props = {
  config: ControllerConfig
  activeBank: BankId
  onBankChange: (bank: BankId) => void
  addPreset: (bank: BankId) => string
  addFxPad: () => string
  duplicatePreset: (id: string) => string | null
  removePreset: (id: string) => void
  removeFxPad: (id: string) => void
  movePreset: (id: string, dir: -1 | 1) => void
  moveFxPad: (id: string, dir: -1 | 1) => void
  savePreset: (p: PresetPad) => void
  saveFx: (f: FxPad) => void
  onSendTest: (msg: MidiMessage, source: string) => void
  onImport: () => void
  onExport: () => void
  onDone: () => void
}

export function EditView(props: Props) {
  const { config, activeBank } = props
  const [selection, setSelection] = useState<Selection>(null)
  const profile = profileOf(config)
  const presets = presetsInBank(config, activeBank)
  const counts = Object.fromEntries(BANK_IDS.map((b) => [b, presetsInBank(config, b).length])) as Record<BankId, number>

  const selectedPreset = selection?.kind === 'preset' ? config.presets.find((p) => p.id === selection.id) : undefined
  const selectedFx = selection?.kind === 'fx' ? config.fxPads.find((f) => f.id === selection.id) : undefined
  const close = () => setSelection(null)

  const padClass = (selected: boolean) =>
    `box-border text-left flex flex-col justify-between rounded-pad bg-surface cursor-pointer transition-colors ${
      selected ? 'border-2 border-edit shadow-[0_0_0_4px_rgba(90,169,255,0.16)]' : 'border-[1.5px] border-dashed border-line-strong hover:border-edit/60'
    }`

  const addTile = (label: string, onClick: () => void, minH: string) => (
    <button
      type="button"
      onClick={onClick}
      className={`${minH} rounded-pad border-[1.5px] border-dashed border-line flex flex-col items-center justify-center gap-1.5 text-ink-dim hover:text-edit hover:border-edit/60 cursor-pointer`}
    >
      <PlusIcon size={22} />
      <span className="text-[13px] font-semibold">{label}</span>
    </button>
  )

  const presetIndexInBank = selectedPreset ? presetsInBank(config, bankOf(selectedPreset)).findIndex((p) => p.id === selectedPreset.id) : -1
  const presetBankSize = selectedPreset ? presetsInBank(config, bankOf(selectedPreset)).length : 0
  const fxIndex = selectedFx ? config.fxPads.findIndex((f) => f.id === selectedFx.id) : -1

  return (
    <div className="flex min-h-full md:h-full">
      <div className="flex-1 min-w-0 md:overflow-y-auto p-4 sm:px-7 sm:py-6 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-edit/40 bg-edit/8 px-4 py-3">
          <span className="text-xs font-bold tracking-[0.12em] uppercase text-edit">Edit mode</span>
          <span className="hidden sm:inline text-[13px] text-ink-dim">Select a pad to change it. Pads do not send MIDI here.</span>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={props.onImport}>Import</Button>
          <Button size="sm" variant="ghost" onClick={props.onExport}>Export</Button>
          <Button size="sm" variant="edit" onClick={props.onDone}>Done</Button>
        </div>

        <BankBar activeBank={activeBank} counts={counts} onChange={(b) => { props.onBankChange(b); if (selection?.kind === 'preset') close() }} tone="edit" />

        <section aria-label="Presets" className="flex flex-col gap-3">
          <SectionTitle>Presets · Bank {activeBank}</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:gap-3.5">
            {presets.map((p, i) => {
              const selected = selection?.kind === 'preset' && selection.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelection({ kind: 'preset', id: p.id })}
                  className={`${padClass(selected)} min-h-[104px] sm:min-h-[140px] px-3.5 py-3`}
                >
                  <span className="flex w-full items-center justify-between text-ink-mute">
                    <span className="font-mono text-xs font-bold">{String(i + 1).padStart(2, '0')}</span>
                    <KeyCap code={p.keyBinding} />
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span className="w-[22px] h-1 rounded-sm" style={{ background: padColor(p.color).hex }} aria-hidden="true" />
                    <span className="text-lg font-bold leading-tight break-words">{p.name}</span>
                    <span className="font-mono text-xs text-ink-dim">{describePresetMidi(profile, p.midi)}</span>
                  </span>
                </button>
              )
            })}
            {addTile('Add preset', () => setSelection({ kind: 'preset', id: props.addPreset(activeBank) }), 'min-h-[104px] sm:min-h-[140px]')}
          </div>
        </section>

        <section aria-label="FX" className="flex flex-col gap-3">
          <SectionTitle>FX · all banks</SectionTitle>
          <div className="grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5 sm:gap-3">
            {config.fxPads.map((f) => {
              const selected = selection?.kind === 'fx' && selection.id === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelection({ kind: 'fx', id: f.id })}
                  className={`${padClass(selected)} min-h-[88px] sm:min-h-[104px] px-3 py-2.5`}
                >
                  <span className="flex w-full items-center justify-end">
                    <KeyCap code={f.keyBinding} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-base font-bold leading-tight break-words">{f.name}</span>
                    <span className="font-mono text-[11px] text-ink-dim">{describeMidi(f.midiOn)}</span>
                  </span>
                </button>
              )
            })}
            {addTile('Add FX', () => setSelection({ kind: 'fx', id: props.addFxPad() }), 'min-h-[88px] sm:min-h-[104px]')}
          </div>
        </section>
      </div>

      {selectedPreset && (
        <Sheet label="Preset inspector" onClose={close}>
          <PresetInspector
            key={selectedPreset.id}
            preset={selectedPreset}
            index={presetIndexInBank}
            fxPads={config.fxPads}
            profile={profile}
            usedKeys={usedKeysFor(config, { kind: 'preset', id: selectedPreset.id, bank: bankOf(selectedPreset) })}
            canMoveLeft={presetIndexInBank > 0}
            canMoveRight={presetIndexInBank < presetBankSize - 1}
            onSave={(p) => {
              props.savePreset(p)
              if (bankOf(p) !== activeBank) props.onBankChange(bankOf(p))
            }}
            onRemove={() => {
              props.removePreset(selectedPreset.id)
              close()
            }}
            onDuplicate={() => {
              const id = props.duplicatePreset(selectedPreset.id)
              if (id) setSelection({ kind: 'preset', id })
            }}
            onMove={(dir) => props.movePreset(selectedPreset.id, dir)}
            onClose={close}
            onSendTest={(msg) => props.onSendTest(msg, `Test ${selectedPreset.name}`)}
          />
        </Sheet>
      )}
      {selectedFx && (
        <Sheet label="FX inspector" onClose={close}>
          <FxInspector
            key={selectedFx.id}
            fx={selectedFx}
            index={fxIndex}
            profile={profile}
            usedKeys={usedKeysFor(config, { kind: 'fx', id: selectedFx.id })}
            canMoveLeft={fxIndex > 0}
            canMoveRight={fxIndex < config.fxPads.length - 1}
            onSave={props.saveFx}
            onRemove={() => {
              props.removeFxPad(selectedFx.id)
              close()
            }}
            onMove={(dir) => props.moveFxPad(selectedFx.id, dir)}
            onClose={close}
            onSendTest={(msg) => props.onSendTest(msg, `Test ${selectedFx.name}`)}
          />
        </Sheet>
      )}
    </div>
  )
}
