'use client'

import { useEffect, useState } from 'react'
import type { LooperBindings, LooperCommands } from '@/lib/types'
import { hasRecordedLoop, type BeatInfo, type LooperState, type UseLooperReturn } from '@/hooks/useLooper'
import { formatKeyCode } from '@/components/KeyBindingField'

export const STATE_LABELS: Record<LooperState, string> = {
  off: 'Off',
  empty: 'Ready',
  armedRec: 'REC on next 1',
  recording: 'Recording',
  playing: 'Playing',
  armedOverdub: 'Overdub at loop start',
  overdubbing: 'Overdub',
  armedStop: 'Stop at end of bar',
  stopped: 'Stopped',
  armedPlay: 'Play on next 1',
}

export function stateTone(state: LooperState): 'red' | 'amber' | 'mint' | 'dim' {
  if (state === 'recording' || state === 'armedRec') return 'red'
  if (state === 'overdubbing' || state === 'armedOverdub') return 'amber'
  if (state === 'playing' || state === 'armedStop' || state === 'armedPlay') return 'mint'
  return 'dim'
}

export const COMMAND_LABELS: { key: keyof LooperCommands; label: string }[] = [
  { key: 'on', label: 'Looper ON' },
  { key: 'off', label: 'Looper OFF' },
  { key: 'recStart', label: 'Start recording' },
  { key: 'recStop', label: 'Stop recording' },
  { key: 'overdubStart', label: 'Start overdub' },
  { key: 'overdubStop', label: 'Stop overdub' },
  { key: 'play', label: 'Play' },
  { key: 'stop', label: 'Stop' },
  { key: 'clear', label: 'Clear loop' },
  { key: 'placementPre', label: 'Pre placement' },
  { key: 'placementPost', label: 'Post placement' },
  { key: 'recVolume', label: 'Record volume (Data 2 = slider)' },
  { key: 'playVolume', label: 'Playback volume (Data 2 = slider)' },
]

export const BINDING_LABELS: { key: keyof LooperBindings; label: string }[] = [
  { key: 'toggle', label: 'Looper on/off' },
  { key: 'rec', label: 'REC / overdub' },
  { key: 'playStop', label: 'Play / stop' },
  { key: 'clear', label: 'Clear' },
  { key: 'click', label: 'Click on/off' },
  { key: 'tap', label: 'Tap BPM' },
]

export function useBeat(looper: UseLooperReturn): BeatInfo | null {
  const [beat, setBeat] = useState<BeatInfo | null>(null)
  const { subscribeBeat, state } = looper
  useEffect(() => subscribeBeat(setBeat), [subscribeBeat])
  return state === 'off' ? null : beat
}

export function BeatDots({ beat, beatsPerBar, size = 16 }: { beat: BeatInfo | null; beatsPerBar: number; size?: number }) {
  return (
    <div className="flex gap-2.5" aria-hidden="true">
      {Array.from({ length: beat?.beatsPerBar ?? beatsPerBar }, (_, i) => {
        const on = beat?.beatInBar === i
        return (
          <span
            key={i}
            className="rounded-full transition-colors duration-75"
            style={{
              width: size,
              height: size,
              background: on ? (i === 0 ? '#ECEDEF' : '#FFB224') : '#2A2E34',
              boxShadow: on && i === 0 ? '0 0 12px 3px rgba(255,255,255,0.55)' : 'none',
            }}
          />
        )
      })}
    </div>
  )
}

type TransportProps = {
  looper: UseLooperReturn
  bindings: LooperBindings
  size?: 'lg' | 'sm'
}

/** REC (becomes OVERDUB once a loop exists), PLAY/STOP and CLEAR. */
export function LooperTransport({ looper, bindings, size = 'lg' }: TransportProps) {
  const { state } = looper
  const isOff = state === 'off'
  const isDubMode = hasRecordedLoop(state) && state !== 'recording'
  const showPlay = state === 'stopped' || state === 'armedPlay' || state === 'empty' || state === 'armedRec' || isOff

  const recActive = isDubMode ? state === 'overdubbing' || state === 'armedOverdub' : state === 'recording' || state === 'armedRec'
  const recArmed = state === 'armedRec' || state === 'armedOverdub'
  const recDisabled =
    isOff ||
    (isDubMode ? state === 'armedStop' || state === 'stopped' || state === 'armedPlay' : state === 'empty' && looper.isOverflow)
  const playActive = state === 'playing' || state === 'armedOverdub' || state === 'overdubbing' || state === 'armedStop'
  const playArmed = state === 'armedPlay' || state === 'armedStop'
  const playDisabled = isOff || state === 'empty' || state === 'recording'

  const base =
    size === 'lg'
      ? 'w-full min-h-[112px] rounded-pad flex flex-col items-center justify-center gap-1'
      : 'w-full min-h-12 rounded-xl flex items-center justify-center gap-2'
  const glyph = size === 'lg' ? 'text-2xl' : 'text-sm'
  const word = size === 'lg' ? 'text-[15px] font-bold tracking-[0.06em]' : 'text-[13px] font-bold tracking-[0.06em]'
  const idle = 'border border-line bg-surface-2 text-ink'
  const cls = (extra: string, armed: boolean) =>
    `${base} ${extra} ${armed ? 'animate-pulse' : ''} cursor-pointer disabled:cursor-not-allowed disabled:text-ink-mute disabled:bg-surface-2 disabled:border-line`

  const hint = (code?: string) =>
    size === 'lg' ? (
      <span className="font-mono text-xs text-ink-dim min-h-4">{code ? `Key · ${formatKeyCode(code)}` : ''}</span>
    ) : null

  return (
    <div className={`grid grid-cols-3 ${size === 'lg' ? 'gap-3' : 'gap-2'}`}>
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={looper.record}
          disabled={recDisabled}
          className={cls(
            recActive
              ? isDubMode
                ? 'border-2 border-preset-hi bg-preset text-preset-ink'
                : 'border-2 border-rec-hi bg-rec text-white'
              : idle,
            recArmed,
          )}
        >
          <span className={glyph} aria-hidden="true">{isDubMode ? '⊕' : '●'}</span>
          <span className={word}>{isDubMode ? 'OVERDUB' : 'REC'}</span>
        </button>
        {hint(bindings.rec)}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={looper.playStop}
          disabled={playDisabled}
          className={cls(playActive ? 'border-2 border-fx bg-fx-deep text-fx-ink' : idle, playArmed)}
        >
          <span className={glyph} aria-hidden="true">{showPlay ? '▶' : '■'}</span>
          <span className={word}>{showPlay ? 'PLAY' : 'STOP'}</span>
        </button>
        {hint(bindings.playStop)}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <button type="button" onClick={looper.clear} disabled={isOff} className={cls(idle, false)}>
          <span className={glyph} aria-hidden="true">✕</span>
          <span className={word}>CLEAR</span>
        </button>
        {hint(bindings.clear)}
      </div>
    </div>
  )
}
