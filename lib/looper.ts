import type { LooperCommands, LooperConfig, MidiMessage } from './types'

const cc = (data1: number, data2: number): MidiMessage => ({
  channel: 1,
  type: 'controlChange',
  data1,
  data2,
})

export const POCKET_MASTER_LOOPER_COMMANDS: LooperCommands = {
  on: cc(59, 127),
  off: cc(59, 0),
  recStart: cc(60, 127),
  // Play ends the recording/overdub and keeps the loop playing
  recStop: cc(62, 127),
  overdubStart: cc(60, 127),
  overdubStop: cc(62, 127),
  play: cc(62, 127),
  stop: cc(62, 0),
  clear: cc(64, 127),
  placementPre: cc(67, 127),
  placementPost: cc(67, 0),
  recVolume: cc(65, 100),
  playVolume: cc(66, 100),
}

export const POCKET_MASTER_MAX_REC_SECONDS = 20

export const DEFAULT_LOOPER_CONFIG: LooperConfig = {
  bpm: 100,
  beatsPerBar: 4,
  beatUnit: 4,
  bars: 2,
  maxRecSeconds: POCKET_MASTER_MAX_REC_SECONDS,
  clickEnabled: true,
  clickVolume: 0.6,
  latencyCompMs: 0,
  loopTrimMs: 0,
  commands: POCKET_MASTER_LOOPER_COMMANDS,
  bindings: {},
}

export const TIME_SIGNATURES: { beatsPerBar: number; beatUnit: 4 | 8 }[] = [
  { beatsPerBar: 2, beatUnit: 4 },
  { beatsPerBar: 3, beatUnit: 4 },
  { beatsPerBar: 4, beatUnit: 4 },
  { beatsPerBar: 5, beatUnit: 4 },
  { beatsPerBar: 6, beatUnit: 8 },
  { beatsPerBar: 7, beatUnit: 8 },
  { beatsPerBar: 9, beatUnit: 8 },
  { beatsPerBar: 12, beatUnit: 8 },
]

/** Fills in defaults for configs saved before the looper existed (or partially imported). */
export function resolveLooperConfig(saved: Partial<LooperConfig> | undefined): LooperConfig {
  return {
    ...DEFAULT_LOOPER_CONFIG,
    ...saved,
    commands: { ...POCKET_MASTER_LOOPER_COMMANDS, ...saved?.commands },
    bindings: { ...saved?.bindings },
  }
}

/** BPM is always counted in quarter notes; in x/8 each click is an eighth. */
export function beatDurationSec(bpm: number, beatUnit: 4 | 8): number {
  return (60 / bpm) * (4 / beatUnit)
}

export function loopDurationSec(cfg: Pick<LooperConfig, 'bpm' | 'beatsPerBar' | 'beatUnit' | 'bars'>): number {
  return cfg.bars * cfg.beatsPerBar * beatDurationSec(cfg.bpm, cfg.beatUnit)
}

export function maxBarsFor(cfg: Pick<LooperConfig, 'bpm' | 'beatsPerBar' | 'beatUnit' | 'maxRecSeconds'>): number {
  const barSec = cfg.beatsPerBar * beatDurationSec(cfg.bpm, cfg.beatUnit)
  return Math.floor(cfg.maxRecSeconds / barSec + 1e-9)
}
