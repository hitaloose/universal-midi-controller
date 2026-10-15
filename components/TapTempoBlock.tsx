'use client'

import { useEffect, useRef, useState } from 'react'
import type { Subdivision } from '@/hooks/useTapTempo'
import type { TapTempoBindings } from '@/lib/types'
import { KeyBindingField, formatKeyCode } from '@/components/KeyBindingField'

const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  eighth: '♪ Eighth',
  dottedEighth: '♪. Dotted 8th',
  quarter: '♩ Quarter',
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
  tapTempoBindings: TapTempoBindings
  onUpdateTapTempoBindings: (b: TapTempoBindings) => void
  otherUsedKeys: Set<string>
  onConfigOpenChange: (open: boolean) => void
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
  tapTempoBindings,
  onUpdateTapTempoBindings,
  otherUsedKeys,
  onConfigOpenChange,
}: Props) {
  const circleRef = useRef<HTMLDivElement>(null)
  const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  const FLASH_DURATION_MS = 80

  useEffect(() => {
    onConfigOpenChange(isConfigOpen)
  }, [isConfigOpen, onConfigOpenChange])

  useEffect(() => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current)
      blinkIntervalRef.current = null
    }
    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current)
      blinkTimeoutRef.current = null
    }
    if (!isEnabled || !bpm) {
      if (circleRef.current) {
        circleRef.current.style.backgroundColor = 'rgba(255,255,255,0.2)'
        circleRef.current.style.boxShadow = 'none'
      }
      return
    }
    const interval = 60000 / bpm
    blinkIntervalRef.current = setInterval(() => {
      if (!circleRef.current) return
      circleRef.current.style.backgroundColor = 'rgb(255,255,255)'
      circleRef.current.style.boxShadow = '0 0 8px 3px rgba(255,255,255,0.8)'
      blinkTimeoutRef.current = setTimeout(() => {
        if (circleRef.current) {
          circleRef.current.style.backgroundColor = 'rgba(255,255,255,0.2)'
          circleRef.current.style.boxShadow = 'none'
        }
      }, FLASH_DURATION_MS)
    }, interval)
    return () => {
      if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current)
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current)
    }
  }, [isEnabled, bpm])

  const tapUsedKeys = new Set([
    ...otherUsedKeys,
    ...[tapTempoBindings.cycleSubdivision, tapTempoBindings.disable].filter(Boolean) as string[],
  ])
  const subdivUsedKeys = new Set([
    ...otherUsedKeys,
    ...[tapTempoBindings.tap, tapTempoBindings.disable].filter(Boolean) as string[],
  ])
  const disableUsedKeys = new Set([
    ...otherUsedKeys,
    ...[tapTempoBindings.tap, tapTempoBindings.cycleSubdivision].filter(Boolean) as string[],
  ])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Pocket Master — Tap Delay
        </span>
        <button
          onClick={() => setIsConfigOpen((v) => !v)}
          title="Configure keys"
          className={[
            'w-5 h-5 flex items-center justify-center rounded transition-colors text-zinc-600 hover:text-zinc-300',
            isConfigOpen ? 'text-indigo-400' : '',
          ].join(' ')}
        >
          ⚙
        </button>
      </div>

      <div className="flex gap-3">
        {/* Subdivision pad */}
        <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <button
            onClick={onCycleSubdivision}
            className={[
              'w-full flex flex-col items-center justify-center gap-1 rounded-lg p-4 h-20 sm:h-24 text-center transition-colors',
              isEnabled
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
            ].join(' ')}
          >
            <span className="text-base font-bold">{SUBDIVISION_LABELS[subdivision]}</span>
            <span className="text-xs opacity-60">subdivision</span>
          </button>
          {tapTempoBindings.cycleSubdivision && (
            <span className="text-xs font-mono text-zinc-500">
              [{formatKeyCode(tapTempoBindings.cycleSubdivision)}]
            </span>
          )}
        </div>

        {/* Tap pad */}
        <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <button
            onClick={onTap}
            className={[
              'relative w-full flex flex-col items-center justify-center gap-1 rounded-lg p-4 h-20 sm:h-24 text-center transition-colors select-none',
              isEnabled
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
            ].join(' ')}
          >
            <div
              ref={circleRef}
              className="absolute top-2 left-2 w-3 h-3 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            />
            <span className="text-lg font-bold tracking-widest">TAP</span>
            {bpm !== null ? (
              <>
                <span className="text-sm font-semibold">{bpm} BPM</span>
                <span className="text-xs opacity-70">
                  ({closestMs !== null ? closestMs : Math.round(delayMs ?? 0)}ms)
                </span>
              </>
            ) : (
              <span className="text-xs opacity-50">tap to start</span>
            )}
          </button>
          {tapTempoBindings.tap && (
            <span className="text-xs font-mono text-zinc-500">
              [{formatKeyCode(tapTempoBindings.tap)}]
            </span>
          )}
        </div>

        {/* Off pad */}
        <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <button
            onClick={onDisable}
            className={[
              'w-full flex flex-col items-center justify-center gap-1 rounded-lg p-4 h-20 sm:h-24 text-center transition-colors',
              !isEnabled
                ? 'bg-red-800 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
            ].join(' ')}
          >
            <span className="text-base font-bold">OFF</span>
            <span className="text-xs opacity-60">tap delay</span>
          </button>
          {tapTempoBindings.disable && (
            <span className="text-xs font-mono text-zinc-500">
              [{formatKeyCode(tapTempoBindings.disable)}]
            </span>
          )}
        </div>
      </div>

      {isConfigOpen && (
        <div className="mt-1 flex flex-col gap-3 bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Keyboard keys
          </p>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">Subdivision</p>
              <KeyBindingField
                value={tapTempoBindings.cycleSubdivision}
                usedKeys={subdivUsedKeys}
                onChange={(code) =>
                  onUpdateTapTempoBindings({ ...tapTempoBindings, cycleSubdivision: code })
                }
              />
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">TAP</p>
              <KeyBindingField
                value={tapTempoBindings.tap}
                usedKeys={tapUsedKeys}
                onChange={(code) =>
                  onUpdateTapTempoBindings({ ...tapTempoBindings, tap: code })
                }
              />
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">OFF</p>
              <KeyBindingField
                value={tapTempoBindings.disable}
                usedKeys={disableUsedKeys}
                onChange={(code) =>
                  onUpdateTapTempoBindings({ ...tapTempoBindings, disable: code })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
