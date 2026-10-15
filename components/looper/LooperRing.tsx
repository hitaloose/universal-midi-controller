'use client'

import type { BeatInfo, LooperState } from '@/hooks/useLooper'
import { STATE_LABELS, BeatDots } from '@/components/looper/shared'

const R = 150
const C = 2 * Math.PI * R
const GAP = 12

const STATE_COLOR: Partial<Record<LooperState, string>> = {
  recording: '#FF5C61',
  overdubbing: '#FFB224',
  armedOverdub: '#3DDC97',
  playing: '#3DDC97',
  armedStop: '#3DDC97',
}

const LABEL_COLOR: Partial<Record<LooperState, string>> = {
  recording: '#FF8A8D',
  armedRec: '#FF8A8D',
  overdubbing: '#FFB224',
  armedOverdub: '#FFB224',
  playing: '#3DDC97',
  armedStop: '#3DDC97',
  armedPlay: '#3DDC97',
}

type Props = {
  state: LooperState
  beat: BeatInfo | null
  bars: number
  beatsPerBar: number
  bpm: number
  signature: string
}

/** One arc per bar: done bars full, the current bar filled up to the current beat. */
export function LooperRing({ state, beat, bars, beatsPerBar, bpm, signature }: Props) {
  const seg = C / bars
  const len = Math.max(seg - GAP, 2)
  const fill = STATE_COLOR[state]
  const current = beat?.loopBar ?? null
  const progress = beat && current !== null ? (beat.beatInBar + 1) / beat.beatsPerBar : 0

  return (
    <div className="relative w-full max-w-[360px] aspect-square">
      <svg
        viewBox="0 0 360 360"
        fill="none"
        strokeLinecap="round"
        role="img"
        aria-label={current !== null ? `Bar ${current} of ${bars}, ${STATE_LABELS[state]}` : STATE_LABELS[state]}
        className="block w-full h-full"
      >
        <g strokeWidth={16}>
          {Array.from({ length: bars }, (_, i) => {
            const rotate = -90 + (i * 360) / bars + (GAP / 2 / C) * 360
            const bar = i + 1
            const filled = fill && current !== null ? (bar < current ? 1 : bar === current ? progress : 0) : 0
            return (
              <g key={i} transform={`rotate(${rotate} 180 180)`}>
                <circle cx="180" cy="180" r={R} stroke="#2A2E34" strokeDasharray={`${len} ${C}`} />
                {filled > 0 && (
                  <circle cx="180" cy="180" r={R} stroke={fill} strokeDasharray={`${len * filled} ${C}`} />
                )}
              </g>
            )
          })}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
        <span className="text-xs font-bold tracking-[0.16em]" style={{ color: LABEL_COLOR[state] ?? '#A3A9B1' }}>
          {STATE_LABELS[state].toUpperCase()}
        </span>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-[56px] sm:text-[72px] font-bold leading-none">{current ?? '-'}</span>
          <span className="text-[22px] sm:text-[28px] text-ink-dim">/{bars}</span>
        </div>
        <BeatDots beat={beat} beatsPerBar={beatsPerBar} />
        <span className="font-mono text-sm text-ink-dim">
          {bpm} BPM · {signature}
        </span>
      </div>
    </div>
  )
}
