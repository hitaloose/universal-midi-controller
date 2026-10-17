export type MidiMessageType = 'programChange' | 'controlChange' | 'noteOn' | 'noteOff'

export type PedalboardType = 'outros' | 'pocketMaster' | 'valetonGp5'

export type BankId = 'A' | 'B' | 'C' | 'D'

export const BANK_IDS: BankId[] = ['A', 'B', 'C', 'D']

export type PadColor = 'amber' | 'mint' | 'blue' | 'violet' | 'coral'

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
  fxAliases?: Record<string, string>
  keyBinding?: string
  /** Missing means bank A (configs saved before banks existed). */
  bank?: BankId
  color?: PadColor
}

export type TapTempoBindings = {
  tap?: string
  cycleSubdivision?: string
  disable?: string
}

export type ControllerConfig = {
  pedalboardType?: PedalboardType
  defaultChannel?: number
  /** Setup wizard switches; missing means shown. */
  showTapDelay?: boolean
  showLooper?: boolean
  presets: PresetPad[]
  fxPads: FxPad[]
  tapTempoBindings?: TapTempoBindings
  looper?: LooperConfig
  songbook?: SongbookConfig
}

export type LooperCommands = {
  on: MidiMessage
  off: MidiMessage
  recStart: MidiMessage
  recStop: MidiMessage
  overdubStart: MidiMessage
  overdubStop: MidiMessage
  play: MidiMessage
  stop: MidiMessage
  clear: MidiMessage
  placementPre: MidiMessage
  placementPost: MidiMessage
  // data2 comes from the volume slider
  recVolume: MidiMessage
  playVolume: MidiMessage
}

export type LooperBindings = {
  toggle?: string
  rec?: string
  playStop?: string
  clear?: string
  click?: string
  tap?: string
}

export type LooperConfig = {
  bpm: number
  beatsPerBar: number
  beatUnit: 4 | 8
  bars: number
  maxRecSeconds: number
  clickEnabled: boolean
  clickVolume: number
  latencyCompMs: number
  /** Shifts the pre-scheduled REC stop to correct a loop that drifts against the click. */
  loopTrimMs: number
  commands: LooperCommands
  bindings: LooperBindings
}

export type SetlistItem = {
  songId: string
  /** Sent when the song comes up; missing keeps whatever preset is active. */
  presetId?: string
}

export type Setlist = {
  id: string
  name: string
  items: SetlistItem[]
}

export type SongbookBindings = {
  prev?: string
  next?: string
  menu?: string
  confirm?: string
}

export type SongbookConfig = {
  setlists: Setlist[]
  fontSize: number
  bindings: SongbookBindings
}
