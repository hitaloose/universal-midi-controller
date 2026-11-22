import type { MidiMessage } from './types'
import { POCKET_MASTER_FX_OPTIONS, type PocketMasterFxOption } from './pocketMasterMidi'

// Pocket Master CFW, "Stock" MIDI map: https://pocketmaster-cfw.guitar-training-generator.com/midi/
// A superset of the stock firmware CCs. Only on/off controls are listed: press-only functions
// (scenes, STOMP) ignore the "off" value, so an FX pad would drift out of sync with the pedal.
export const POCKET_MASTER_CFW_FX_OPTIONS: PocketMasterFxOption[] = [
  ...POCKET_MASTER_FX_OPTIONS,
  { cc: 93, label: 'Drum play' },
  { cc: 114, label: 'Freeze (reverb)' },
  { cc: 86, label: 'Global EQ' },
  { cc: 87, label: 'DLY Sync' },
]

/** CC 68 picks the BPM range, CC 69 the BPM inside it. */
const CFW_TEMPO_RANGE_CC = 68
const CFW_TEMPO_BPM_CC = 69
/** Delay Sync on: the delay follows the tempo at its note value (1/4 by default). */
const CFW_DLY_SYNC_CC = 87

export const CFW_MIN_BPM = 40
export const CFW_MAX_BPM = 260

/**
 * The pedal's delay follows the tempo at a 1/4 note, so the subdivision is folded into the BPM:
 * a delay of `delayMs` is a quarter note at 60000 / delayMs BPM. Clamped to what the CFW accepts.
 */
export function cfwTempoForDelay(delayMs: number): { bpm: number; ms: number } {
  const bpm = Math.min(CFW_MAX_BPM, Math.max(CFW_MIN_BPM, Math.round(60000 / delayMs)))
  return { bpm, ms: Math.round(60000 / bpm) }
}

/** Sync on, then tempo set: 40–127 → (0, bpm), 128–255 → (1, bpm − 128), 256–260 → (2, bpm − 256). */
export function cfwTempoMessages(bpm: number, channel: number): MidiMessage[] {
  const range = Math.floor(bpm / 128)
  const cc = (data1: number, data2: number): MidiMessage => ({ channel, type: 'controlChange', data1, data2 })
  return [cc(CFW_DLY_SYNC_CC, 127), cc(CFW_TEMPO_RANGE_CC, range), cc(CFW_TEMPO_BPM_CC, bpm - range * 128)]
}
