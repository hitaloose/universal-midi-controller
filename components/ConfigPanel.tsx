'use client'

import { useEffect, useState } from 'react'
import type { ControllerConfig, FxPad, MidiMessage, MidiMessageType, PresetPad } from '@/lib/types'
import { KeyBindingField } from '@/components/KeyBindingField'

type PadRef =
  | { kind: 'preset'; id: string }
  | { kind: 'fx'; id: string }

type Props = {
  padRef: PadRef | null
  config: ControllerConfig
  onSave: (config: ControllerConfig) => void
  onRemove: (id: string, kind: 'preset' | 'fx') => void
  onClose: () => void
}

const MIDI_TYPES: { value: MidiMessageType; label: string }[] = [
  { value: 'programChange', label: 'Program Change' },
  { value: 'controlChange', label: 'Control Change' },
  { value: 'noteOn', label: 'Note On' },
  { value: 'noteOff', label: 'Note Off' },
]

function MidiFields({
  label,
  value,
  onChange,
}: {
  label: string
  value: MidiMessage
  onChange: (msg: MidiMessage) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2 border border-zinc-700 rounded-lg p-3">
      <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-1">
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Canal</span>
          <input
            type="number"
            min={1}
            max={16}
            value={value.channel}
            onChange={(e) => onChange({ ...value, channel: Number(e.target.value) })}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Tipo</span>
          <select
            value={value.type}
            onChange={(e) => onChange({ ...value, type: e.target.value as MidiMessageType })}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {MIDI_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Data 1</span>
          <input
            type="number"
            min={0}
            max={127}
            value={value.data1}
            onChange={(e) => onChange({ ...value, data1: Number(e.target.value) })}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Data 2</span>
          <input
            type="number"
            min={0}
            max={127}
            value={value.data2}
            onChange={(e) => onChange({ ...value, data2: Number(e.target.value) })}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </label>
      </div>
    </fieldset>
  )
}

function PresetEditor({
  preset,
  fxPads,
  usedKeys,
  onSave,
  onRemove,
}: {
  preset: PresetPad
  fxPads: FxPad[]
  usedKeys: Set<string>
  onSave: (p: PresetPad) => void
  onRemove: () => void
}) {
  const [name, setName] = useState(preset.name)
  const [midi, setMidi] = useState(preset.midi)
  const [fxStates, setFxStates] = useState(preset.fxInitialStates)
  const [fxSoloStates, setFxSoloStates] = useState<Record<string, boolean>>(preset.fxSoloStates ?? {})
  const [keyBinding, setKeyBinding] = useState(preset.keyBinding)

  useEffect(() => {
    setName(preset.name)
    setMidi(preset.midi)
    setFxStates(preset.fxInitialStates)
    setFxSoloStates(preset.fxSoloStates ?? {})
    setKeyBinding(preset.keyBinding)
  }, [preset.id, preset.name, preset.midi, preset.fxInitialStates, preset.fxSoloStates, preset.keyBinding])

  const handleSave = () => onSave({ ...preset, name, midi, fxInitialStates: fxStates, fxSoloStates, keyBinding })

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nome</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        />
      </label>

      <KeyBindingField value={keyBinding} usedKeys={usedKeys} onChange={setKeyBinding} />

      <MidiFields label="Comando MIDI" value={midi} onChange={setMidi} />

      {fxPads.length > 0 && (
        <>
          <fieldset className="flex flex-col gap-2 border border-zinc-700 rounded-lg p-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-1">
              Estado inicial dos FX
            </legend>
            {fxPads.map((fx) => (
              <label key={fx.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fxStates[fx.id] ?? false}
                  onChange={(e) => setFxStates((prev) => ({ ...prev, [fx.id]: e.target.checked }))}
                  className="accent-indigo-500 w-4 h-4"
                />
                <span className="text-sm text-zinc-300">{fx.name}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-2 border border-zinc-700 rounded-lg p-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-1">
              FX no modo solo
            </legend>
            {fxPads.map((fx) => (
              <label key={fx.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fxSoloStates[fx.id] ?? false}
                  onChange={(e) => setFxSoloStates((prev) => ({ ...prev, [fx.id]: e.target.checked }))}
                  className="accent-red-500 w-4 h-4"
                />
                <span className="text-sm text-zinc-300">{fx.name}</span>
              </label>
            ))}
          </fieldset>
        </>
      )}

      <button
        onClick={handleSave}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg py-2 transition-colors text-sm"
      >
        Salvar
      </button>
      <button
        onClick={onRemove}
        className="text-xs text-zinc-600 hover:text-red-400 transition-colors text-center"
      >
        Remover preset
      </button>
    </div>
  )
}

function FxEditor({
  fx,
  usedKeys,
  onSave,
  onRemove,
}: {
  fx: FxPad
  usedKeys: Set<string>
  onSave: (f: FxPad) => void
  onRemove: () => void
}) {
  const [name, setName] = useState(fx.name)
  const [midiOn, setMidiOn] = useState(fx.midiOn)
  const [midiOff, setMidiOff] = useState(fx.midiOff)
  const [keyBinding, setKeyBinding] = useState(fx.keyBinding)

  useEffect(() => {
    setName(fx.name)
    setMidiOn(fx.midiOn)
    setMidiOff(fx.midiOff)
    setKeyBinding(fx.keyBinding)
  }, [fx.id, fx.name, fx.midiOn, fx.midiOff, fx.keyBinding])

  const handleSave = () => onSave({ ...fx, name, midiOn, midiOff, keyBinding })

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nome</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        />
      </label>

      <KeyBindingField value={keyBinding} usedKeys={usedKeys} onChange={setKeyBinding} />

      <MidiFields label="Comando MIDI ON" value={midiOn} onChange={setMidiOn} />
      <MidiFields label="Comando MIDI OFF" value={midiOff} onChange={setMidiOff} />

      <button
        onClick={handleSave}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg py-2 transition-colors text-sm"
      >
        Salvar
      </button>
      <button
        onClick={onRemove}
        className="text-xs text-zinc-600 hover:text-red-400 transition-colors text-center"
      >
        Remover FX
      </button>
    </div>
  )
}

export function ConfigPanel({ padRef, config, onSave, onRemove, onClose }: Props) {
  if (!padRef) return null

  const handleSavePreset = (updated: PresetPad) => {
    const presets = config.presets.map((p) => (p.id === updated.id ? updated : p))
    onSave({ ...config, presets })
  }

  const handleSaveFx = (updated: FxPad) => {
    const fxPads = config.fxPads.map((f) => (f.id === updated.id ? updated : f))
    onSave({ ...config, fxPads })
  }

  const preset = padRef.kind === 'preset' ? config.presets.find((p) => p.id === padRef.id) : null
  const fx = padRef.kind === 'fx' ? config.fxPads.find((f) => f.id === padRef.id) : null

  const tapKeys = Object.values(config.tapTempoBindings ?? {}).filter(Boolean) as string[]

  const presetUsedKeys = preset
    ? new Set([
        ...config.presets.filter((p) => p.id !== preset.id && p.keyBinding).map((p) => p.keyBinding!),
        ...config.fxPads.filter((f) => f.keyBinding).map((f) => f.keyBinding!),
        ...tapKeys,
      ])
    : new Set<string>()

  const fxUsedKeys = fx
    ? new Set([
        ...config.presets.filter((p) => p.keyBinding).map((p) => p.keyBinding!),
        ...config.fxPads.filter((f) => f.id !== fx.id && f.keyBinding).map((f) => f.keyBinding!),
        ...tapKeys,
      ])
    : new Set<string>()

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 h-full w-80 bg-zinc-900 border-l border-zinc-700 z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <h2 className="text-sm font-semibold text-white">
            {padRef.kind === 'preset' ? 'Configurar Preset' : 'Configurar FX'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {preset && (
            <PresetEditor
              preset={preset}
              fxPads={config.fxPads}
              usedKeys={presetUsedKeys}
              onSave={handleSavePreset}
              onRemove={() => onRemove(preset.id, 'preset')}
            />
          )}
          {fx && (
            <FxEditor
              fx={fx}
              usedKeys={fxUsedKeys}
              onSave={handleSaveFx}
              onRemove={() => onRemove(fx.id, 'fx')}
            />
          )}
        </div>
      </aside>
    </>
  )
}
