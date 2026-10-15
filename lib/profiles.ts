import type { BankId, ControllerConfig, FxPad, MidiMessage, PedalboardType, PresetPad } from './types'
import { POCKET_MASTER_FX_OPTIONS, POCKET_MASTER_PRESET_CC } from './pocketMasterMidi'
import { VALETON_GP5_FX_OPTIONS, VALETON_GP5_PATCH_CC } from './valetonGp5Midi'
import { makeId } from './utils'

export type FxOption = { cc: number; label: string }

export type PedalboardProfile = {
  type: PedalboardType
  label: string
  features: string[]
  /** Label for the preset number field in the inspector. */
  presetLabel: string
  presetRange: [number, number]
  /** MIDI that selects preset `n` (in `presetRange`). */
  presetMidi: (n: number, channel: number) => MidiMessage
  /** Inverse of `presetMidi`, or null when the message is not one of this profile's preset commands. */
  presetNumber: (midi: MidiMessage) => number | null
  formatPreset: (n: number) => string
  fxOptions: FxOption[]
  /** Order the setup wizard uses to fill FX pads. */
  defaultFx: number[]
  hasTapDelay: boolean
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export const PROFILES: Record<PedalboardType, PedalboardProfile> = {
  pocketMaster: {
    type: 'pocketMaster',
    label: 'Sonicake Pocket Master',
    features: ['Presets 1–100', 'FX shortcuts', 'Tap delay via SysEx', 'Looper'],
    presetLabel: 'Pocket Master preset',
    presetRange: [1, 100],
    presetMidi: (n, channel) => ({ channel, type: 'controlChange', data1: POCKET_MASTER_PRESET_CC, data2: n }),
    presetNumber: (m) =>
      m.type === 'controlChange' && m.data1 === POCKET_MASTER_PRESET_CC && m.data2 >= 1 && m.data2 <= 100 ? m.data2 : null,
    // 1–50 → P01–P50, 51–100 → F01–F50
    formatPreset: (n) => (n <= 50 ? `P${pad2(n)}` : `F${pad2(n - 50)}`),
    fxOptions: POCKET_MASTER_FX_OPTIONS,
    defaultFx: [44, 45, 49, 50, 51, 43, 46, 48, 47, 58, 92],
    hasTapDelay: true,
  },
  valetonGp5: {
    type: 'valetonGp5',
    label: 'Valeton GP-5',
    features: ['Patches 0–99', 'FX shortcuts'],
    presetLabel: 'GP-5 patch',
    presetRange: [0, 99],
    presetMidi: (n, channel) => ({ channel, type: 'controlChange', data1: VALETON_GP5_PATCH_CC, data2: n }),
    presetNumber: (m) =>
      m.type === 'controlChange' && m.data1 === VALETON_GP5_PATCH_CC && m.data2 <= 99 ? m.data2 : null,
    formatPreset: (n) => pad2(n),
    fxOptions: VALETON_GP5_FX_OPTIONS,
    defaultFx: [49, 50, 55, 56, 57, 48, 52, 53, 54, 51, 58],
    hasTapDelay: false,
  },
  outros: {
    type: 'outros',
    label: 'Other MIDI device',
    features: ['Blank pads', 'Any channel, type and value'],
    presetLabel: 'Program',
    presetRange: [0, 127],
    presetMidi: (n, channel) => ({ channel, type: 'programChange', data1: n, data2: 0 }),
    presetNumber: (m) => (m.type === 'programChange' ? m.data1 : null),
    formatPreset: (n) => `PC ${pad2(n)}`,
    fxOptions: [],
    defaultFx: [],
    hasTapDelay: false,
  },
}

export const PROFILE_ORDER: PedalboardType[] = ['pocketMaster', 'valetonGp5', 'outros']

export function profileOf(config: Pick<ControllerConfig, 'pedalboardType'>): PedalboardProfile {
  return PROFILES[config.pedalboardType ?? 'outros']
}

/** "DRV (Drive)" → "Drive", "FX1" → "FX1": pads have little room. */
export function shortFxName(label: string): string {
  const m = label.match(/\(([^)]+)\)/)
  return m ? m[1] : label
}

/** Short label for the preset tag on a pad ("P02", "PC 03", "CC 7 = 2"). */
export function describePresetMidi(profile: PedalboardProfile, midi: MidiMessage): string {
  const n = profile.presetNumber(midi)
  if (n !== null) return profile.formatPreset(n)
  return describeMidi(midi)
}

export function describeMidi(m: MidiMessage): string {
  if (m.type === 'programChange') return `PC ${m.data1}`
  if (m.type === 'controlChange') return `CC ${m.data1} = ${m.data2}`
  return `${m.type === 'noteOn' ? 'Note on' : 'Note off'} ${m.data1}`
}

export function makeFxPad(profile: PedalboardProfile, index: number, channel: number): FxPad {
  const cc = profile.defaultFx[index]
  const option = profile.fxOptions.find((o) => o.cc === cc)
  const data1 = option ? option.cc : index
  return {
    id: makeId(),
    name: option ? shortFxName(option.label) : `FX ${index + 1}`,
    midiOn: { channel, type: 'controlChange', data1, data2: 127 },
    midiOff: { channel, type: 'controlChange', data1, data2: 0 },
  }
}

export function makePreset(
  profile: PedalboardProfile,
  index: number,
  bank: BankId,
  fxPads: FxPad[],
  channel: number,
): PresetPad {
  const [min, max] = profile.presetRange
  return {
    id: makeId(),
    name: `Preset ${index + 1}`,
    midi: profile.presetMidi(Math.min(max, min + index), channel),
    fxInitialStates: Object.fromEntries(fxPads.map((fx) => [fx.id, false])),
    fxSoloStates: Object.fromEntries(fxPads.map((fx) => [fx.id, false])),
    bank,
  }
}

export type LayoutTemplate = { id: string; label: string; presets: number; fx: number }

export const TEMPLATES: LayoutTemplate[] = [
  { id: 'starter', label: 'Starter', presets: 4, fx: 6 },
  { id: 'compact', label: 'Compact', presets: 4, fx: 3 },
  { id: 'bigRig', label: 'Big rig', presets: 8, fx: 8 },
]

export function buildInitialConfig(opts: {
  type: PedalboardType
  presets: number
  fx: number
  showTapDelay: boolean
  showLooper: boolean
}): ControllerConfig {
  const profile = PROFILES[opts.type]
  const channel = 1
  const fxPads = Array.from({ length: opts.fx }, (_, i) => makeFxPad(profile, i, channel))
  const presets = Array.from({ length: opts.presets }, (_, i) => makePreset(profile, i, 'A', fxPads, channel))
  return {
    pedalboardType: opts.type,
    defaultChannel: channel,
    showTapDelay: opts.showTapDelay,
    showLooper: opts.showLooper,
    presets,
    fxPads,
  }
}
