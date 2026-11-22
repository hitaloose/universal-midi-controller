export type MidiMessageType = 'programChange' | 'controlChange' | 'noteOn' | 'noteOff'

export type PedalboardType = 'outros' | 'pocketMaster' | 'pocketMasterCfw' | 'valetonGp5'

export type BankId = 'A' | 'B' | 'C' | 'D'

export const BANK_IDS: BankId[] = ['A', 'B', 'C', 'D']

export type Subdivision = 'eighth' | 'dottedEighth' | 'quarter'

/** Tap delay tempo kept with a preset and sent to the pedal when the preset is selected. */
export type PresetTempo = {
  bpm: number
  subdivision: Subdivision
}

export type SceneId = 'base' | 'sc1' | 'sc2'

/** A pedal scene: the FX pads it turns on/off. A pad missing here follows the preset's start state (BASE). */
export type PresetScene = {
  name: string
  fxStates: Record<string, boolean>
}

export type StompSwitchId = 'fs1' | 'fs2'

/** A STOMP footswitch: toggles a block group on the pedal; `initialOn` is the group state the preset loads with. */
export type StompSwitch = {
  name: string
  initialOn: boolean
}

export type PresetControlBindings = Partial<Record<SceneId | StompSwitchId, string>>

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
  /** Missing: the app sends no tempo and the pedal keeps the preset's own. */
  tempo?: PresetTempo
  /** Pressing the active preset again enters solo. Missing means on (configs saved before it existed). */
  soloEnabled?: boolean
  /** Scene buttons (SC1 / SC2, BASE is the preset itself). Missing: no scene buttons. */
  scenes?: Record<'sc1' | 'sc2', PresetScene>
  /** STOMP buttons; only the switches present are shown. Missing: no STOMP buttons. */
  stomp?: Partial<Record<StompSwitchId, StompSwitch>>
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
  presetControlBindings?: PresetControlBindings
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
