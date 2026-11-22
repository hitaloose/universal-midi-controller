import type { MidiMessage, SceneId, StompSwitchId, Subdivision } from './types'
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
/** Delay Sync on: the delay time follows the tempo at the delay's note value. */
const CFW_DLY_SYNC_CC = 87
/** "Tap + note": sets the delay note (Sync on only). It also counts as a tap. */
export const CFW_NOTE_CC: Record<Subdivision, number> = { quarter: 27, dottedEighth: 28, eighth: 29 }
/** A second tap within this window makes the pedal compute a BPM from the two. */
export const CFW_TAP_WINDOW_MS = 2000

export const CFW_MIN_BPM = 40
export const CFW_MAX_BPM = 260

const NOTE_FACTOR: Record<Subdivision, number> = { quarter: 1, dottedEighth: 0.75, eighth: 0.5 }

/** Tempo the CFW accepts. */
export function cfwBpm(bpm: number): number {
  return Math.min(CFW_MAX_BPM, Math.max(CFW_MIN_BPM, Math.round(bpm)))
}

/** Delay time the pedal ends up with for a tempo and note. */
export function cfwDelayMs(bpm: number, subdivision: Subdivision): number {
  return Math.round((60000 / cfwBpm(bpm)) * NOTE_FACTOR[subdivision])
}

/**
 * Sync on, optional note, then tempo set last so it wins over the note's tap.
 * Tempo set: 40–127 → (0, bpm), 128–255 → (1, bpm − 128), 256–260 → (2, bpm − 256).
 */
export function cfwTempoMessages(bpm: number, note: Subdivision | null, channel: number): MidiMessage[] {
  const value = cfwBpm(bpm)
  const range = Math.floor(value / 128)
  const cc = (data1: number, data2: number): MidiMessage => ({ channel, type: 'controlChange', data1, data2 })
  return [
    cc(CFW_DLY_SYNC_CC, 127),
    ...(note ? [cc(CFW_NOTE_CC[note], 127)] : []),
    cc(CFW_TEMPO_RANGE_CC, range),
    cc(CFW_TEMPO_BPM_CC, value - range * 128),
  ]
}

/** Scene select (≥ 64). The same scene again also returns to BASE, but CC 85 is sent for that to be explicit. */
export const CFW_SCENE_CC: Record<SceneId, number> = { sc1: 82, sc2: 83, base: 85 }
/** STOMP FS1 / FS2 (≥ 64): each message toggles the preset's block group. */
export const CFW_STOMP_CC: Record<StompSwitchId, number> = { fs1: 80, fs2: 81 }
