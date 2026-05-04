export type MidiMessageType = 'programChange' | 'controlChange' | 'noteOn' | 'noteOff'

export type MidiMessage = {
  channel: number
  type: MidiMessageType
  data1: number
  data2: number
}

export type FxPad = {
  id: string
  name: string
  midiOn: MidiMessage
  midiOff: MidiMessage
  keyBinding?: string
}

export type PresetPad = {
  id: string
  name: string
  midi: MidiMessage
  fxInitialStates: Record<string, boolean>
  fxSoloStates: Record<string, boolean>
  keyBinding?: string
}

export type TapTempoBindings = {
  tap?: string
  cycleSubdivision?: string
  disable?: string
}

export type ControllerConfig = {
  presets: PresetPad[]
  fxPads: FxPad[]
  tapTempoBindings?: TapTempoBindings
}
