'use client'

import { useEffect, useRef } from 'react'
import type { Subdivision } from '@/hooks/useTapTempo'

const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  eighth: '♪ Colcheia',
  dottedEighth: '♪. Col. Pont.',
  quarter: '♩ Semínima',
}

type Props = {
  isEnabled: boolean
  bpm: number | null
  subdivision: Subdivision
  delayMs: number | null
  closestMs: number | null
  onTap: () => void
  onCycleSubdivision: () => void
  onDisable: () => void
}

export function TapTempoBlock({
  isEnabled,
  bpm,
  subdivision,
  delayMs,
  closestMs,
  onTap,
  onCycleSubdivision,
  onDisable,
}: Props) {
  const tapPadRef = useRef<HTMLButtonElement>(null)
  const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current)
      blinkIntervalRef.current = null
    }
    if (!isEnabled || !bpm) {
      if (tapPadRef.current) tapPadRef.current.style.opacity = '1'
      return
    }
    const interval = 60000 / bpm
    let visible = true
    blinkIntervalRef.current = setInterval(() => {
      visible = !visible
      if (tapPadRef.current) tapPadRef.current.style.opacity = visible ? '1' : '0.4'
    }, interval / 2)
    return () => {
      if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current)
    }
  }, [isEnabled, bpm])

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Pocket Master — Tap Delay
      </span>
      <div className="flex gap-3">
        {/* Subdivision pad */}
        <button
          onClick={onCycleSubdivision}
          className={[
            'flex flex-col items-center justify-center gap-1 rounded-lg p-4 w-36 h-24 text-center transition-colors',
            isEnabled
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
          ].join(' ')}
        >
          <span className="text-base font-bold">{SUBDIVISION_LABELS[subdivision]}</span>
          <span className="text-xs opacity-60">subdivisão</span>
        </button>

        {/* Tap pad */}
        <button
          ref={tapPadRef}
          onClick={onTap}
          className={[
            'flex flex-col items-center justify-center gap-1 rounded-lg p-4 w-36 h-24 text-center transition-colors select-none',
            isEnabled
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
          ].join(' ')}
        >
          <span className="text-lg font-bold tracking-widest">TAP</span>
          {bpm !== null ? (
            <>
              <span className="text-sm font-semibold">{bpm} BPM</span>
              <span className="text-xs opacity-70">
                ({closestMs !== null ? closestMs : Math.round(delayMs ?? 0)}ms)
              </span>
            </>
          ) : (
            <span className="text-xs opacity-50">toque para começar</span>
          )}
        </button>

        {/* Off pad */}
        <button
          onClick={onDisable}
          className={[
            'flex flex-col items-center justify-center gap-1 rounded-lg p-4 w-36 h-24 text-center transition-colors',
            !isEnabled
              ? 'bg-red-800 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
          ].join(' ')}
        >
          <span className="text-base font-bold">OFF</span>
          <span className="text-xs opacity-60">tap delay</span>
        </button>
      </div>
    </div>
  )
}
