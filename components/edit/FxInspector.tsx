'use client'

import { useState } from 'react'
import type { FxPad, MidiMessage } from '@/lib/types'
import { shortFxName, type PedalboardProfile } from '@/lib/profiles'
import { KeyBindingField } from '@/components/KeyBindingField'
import { MidiFields } from '@/components/MidiFields'
import { FieldLabel, inputClass } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChevronLeft, ChevronRight, CloseIcon } from '@/components/ui/icons'

type Props = {
  fx: FxPad
  index: number
  profile: PedalboardProfile
  usedKeys: Set<string>
  canMoveLeft: boolean
  canMoveRight: boolean
  onSave: (f: FxPad) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onClose: () => void
  onSendTest: (msg: MidiMessage) => void
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const isDefaultName = (name: string) => name.trim() === '' || /^FX \d+$/.test(name)

export function FxInspector(props: Props) {
  const { fx, profile } = props
  const [draft, setDraft] = useState<FxPad>(fx)
  const set = (patch: Partial<FxPad>) => setDraft((d) => ({ ...d, ...patch }))
  const dirty = JSON.stringify(draft) !== JSON.stringify(fx)
  const matching = profile.fxOptions.find(
    (o) => draft.midiOn.type === 'controlChange' && draft.midiOn.data1 === o.cc,
  )

  const pickShortcut = (cc: number) => {
    const option = profile.fxOptions.find((o) => o.cc === cc)
    if (!option) return
    const channel = draft.midiOn.channel
    set({
      midiOn: { channel, type: 'controlChange', data1: cc, data2: 127 },
      midiOff: { channel, type: 'controlChange', data1: cc, data2: 0 },
      name: isDefaultName(draft.name) || profile.fxOptions.some((o) => shortFxName(o.label) === draft.name)
        ? shortFxName(option.label)
        : draft.name,
    })
  }

  return (
    <>
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-line-soft">
        <span className="w-3 h-3 rounded-full bg-fx" aria-hidden="true" />
        <h2 className="m-0 text-lg font-bold">FX {pad2(props.index + 1)}</h2>
        <span className="text-xs font-bold text-edit bg-edit/12 rounded-full px-2.5 py-0.5">Selected</span>
        <div className="flex-1" />
        <button type="button" aria-label="Close inspector" onClick={props.onClose} className="w-11 h-11 flex items-center justify-center rounded-control text-ink-dim hover:text-ink hover:bg-surface cursor-pointer">
          <CloseIcon size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Name</FieldLabel>
          <input value={draft.name} onChange={(e) => set({ name: e.target.value })} className={inputClass} />
        </label>

        <KeyBindingField value={draft.keyBinding} usedKeys={props.usedKeys} onChange={(keyBinding) => set({ keyBinding })} />

        {profile.fxOptions.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <FieldLabel>{profile.label} effect</FieldLabel>
            <select
              value={matching?.cc ?? ''}
              onChange={(e) => e.target.value && pickShortcut(Number(e.target.value))}
              className={inputClass}
            >
              <option value="">Custom MIDI</option>
              {profile.fxOptions.map((o) => (
                <option key={o.cc} value={o.cc}>
                  {o.label} · CC {o.cc}
                </option>
              ))}
            </select>
          </label>
        )}

        <MidiFields label="MIDI on" value={draft.midiOn} onChange={(midiOn) => set({ midiOn })} />
        <MidiFields label="MIDI off" value={draft.midiOff} onChange={(midiOff) => set({ midiOff })} />

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => props.onSendTest(draft.midiOn)}>Test on</Button>
          <Button size="sm" onClick={() => props.onSendTest(draft.midiOff)}>Test off</Button>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Position</FieldLabel>
          <div className="flex gap-2">
            <Button size="sm" disabled={!props.canMoveLeft} onClick={() => props.onMove(-1)}>
              <ChevronLeft size={16} /> Move left
            </Button>
            <Button size="sm" disabled={!props.canMoveRight} onClick={() => props.onMove(1)}>
              Move right <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-3.5 border-t border-line-soft">
        <button type="button" onClick={props.onRemove} className="h-11 px-3 text-[13px] font-semibold text-panic hover:underline cursor-pointer">
          Remove
        </button>
        <div className="flex-1" />
        <Button disabled={!dirty} onClick={() => setDraft(fx)}>Discard</Button>
        <Button variant="primary" disabled={!dirty} onClick={() => props.onSave(draft)}>Save FX</Button>
      </div>
    </>
  )
}
